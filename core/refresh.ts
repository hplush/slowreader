import { atom, computed, effect, map } from 'nanostores'

import {
  type AccountValue,
  getAccountAuth,
  loadAccount,
  loadAccounts
} from './account.ts'
import { onClient, waitSyncOrOffline } from './client.ts'
import { getEnvironment } from './environment.ts'
import {
  changeFeed,
  type FeedByUrl,
  type FeedValue,
  getFeedLatestPosts,
  loadFeed,
  loadFeedsByUrls,
  loadFeedsForRefresh
} from './feed.ts'
import { type FilterChecker, loadFilterChecker } from './filter.ts'
import { createDownloadTask, type DownloadTask } from './lib/download.ts'
import { canUseNetwork } from './lib/network.ts'
import { createQueue, type QueueCallback } from './lib/queue.ts'
import { increaseKey, waitLoading } from './lib/stores.ts'
import { loaders } from './loader/index.ts'
import {
  DEFAULT_MEDIA_STATISTICS,
  mediaErrors,
  mediaProgress,
  mediaStatistics,
  stopMediaCache,
  syncMediaCache
} from './media-cache.ts'
import { nightLocked } from './night-lock.ts'
import {
  deleteFastPostsBefore,
  getSortedAt,
  loadPostOriginIdsByAccount,
  loadPostOriginIdsByFeed,
  type NewPost,
  type OriginPost,
  type PostAuthor,
  processOriginPost,
  withoutDeletedPosts
} from './post.ts'
import { getPostsFrequency, type PostsList } from './posts-list.ts'
import { getCrdt, getTables, openedDatabase } from './schema.ts'
import {
  autoRefresh,
  cacheImages,
  cacheMediaReading,
  cacheVideos,
  fastPostsMaxAge,
  lastRefresh,
  syncedSettingsLoading
} from './settings.ts'
import { linkThreads } from './thread.ts'

export const DEFAULT_REFRESH_STATISTICS = {
  errorFeeds: 0,
  errorRequests: 0,
  foundFast: 0,
  foundSlow: 0,
  initializing: false,
  processedFeeds: 0,
  totalFeeds: 0
}

export type RefreshStatistics = typeof DEFAULT_REFRESH_STATISTICS

export const refreshStatistics = map({ ...DEFAULT_REFRESH_STATISTICS })

/**
 * Feed or account, which failed. Account is shown like a feed.
 */
export type RefreshError =
  | { account: Pick<AccountValue, 'id' | 'title'>; error: Error }
  | { error: Error; feed: Pick<FeedValue, 'id' | 'title' | 'url'> }

export const refreshErrors = atom<RefreshError[]>([])

export type refreshStatusValue =
  | 'done'
  | 'error'
  | 'refreshing'
  | 'refreshingError'
  | 'start'

export const refreshStatus = atom<refreshStatusValue>('start')

export const isRefreshing = computed(refreshStatus, icon => {
  return icon.startsWith('refreshing')
})

let doneTimeout: NodeJS.Timeout | undefined

export const refreshProgress = computed(refreshStatistics, stats => {
  if (stats.initializing || stats.totalFeeds === 0) {
    return 0
  } else {
    return Math.floor((stats.processedFeeds / stats.totalFeeds) * 100) / 100
  }
})

export type RefreshTotalProgress = {
  stage: 'media' | 'onlyPosts' | 'posts'
  value: number
}

export const refreshTotalProgress = computed(
  [
    refreshStatistics,
    refreshProgress,
    mediaProgress,
    cacheMediaReading,
    cacheImages,
    cacheVideos
  ],
  (stats, feeds, media, reading, images, videos): RefreshTotalProgress => {
    let checked = stats.totalFeeds === 0 && !stats.initializing ? 1 : feeds
    if (reading === 'none' || (images === 'never' && videos === 'never')) {
      return { stage: 'onlyPosts', value: checked }
    } else if (checked < 1) {
      return { stage: 'posts', value: checked }
    } else {
      return { stage: 'media', value: media }
    }
  }
)

type RefreshTarget = { account: AccountValue } | { feed: FeedValue }

let queue = createQueue<RefreshTarget>([])

interface TargetRefresh {
  adding: ({ id: string } & NewPost)[]
  /**
   * Feeds by URL for the home timeline
   */
  feeds: Map<string, FeedByUrl> | undefined
  filters: Map<string, FilterChecker>
  known: Set<string> | undefined
  newest: OriginPost | undefined
  page: OriginPost[]
  pages: PostsList
  target: RefreshTarget
  task: DownloadTask
  /**
   * The newest posts of virtual feeds to move their markers too, so they
   * will not load the same posts after switching to anonymous refresh
   */
  virtual: Map<string, OriginPost>
}

type Marker = Pick<FeedValue, 'lastOriginId' | 'lastPublishedAt'>

function getMarker(target: RefreshTarget): Marker {
  return 'feed' in target ? target.feed : target.account
}

function wasAlreadyAdded(marker: Marker, origin: OriginPost): boolean {
  let sortedAt = getSortedAt(origin)
  if (sortedAt && marker.lastPublishedAt) {
    return sortedAt <= marker.lastPublishedAt
  } else {
    return origin.originId === marker.lastOriginId
  }
}

async function getFilters(
  state: TargetRefresh,
  feedId: string
): Promise<FilterChecker> {
  let filters = state.filters.get(feedId)
  if (!filters) {
    filters = await loadFilterChecker(feedId)
    state.filters.set(feedId, filters)
  }
  return filters
}

function sortPage(posts: OriginPost[]): void {
  if (posts[0] && getSortedAt(posts[0])) {
    posts.sort((a, b) => {
      return (getSortedAt(b) ?? 0) - (getSortedAt(a) ?? 0)
    })
  }
}

/**
 * Collect a single page of the feed. Returns `false` if the feed was deleted
 * during the refresh.
 */
async function collectFeedPage(
  state: TargetRefresh,
  feedId: string
): Promise<boolean> {
  let feed = await loadFeed(feedId)
  if (!feed) return false

  let posts = state.page
  let first = posts[0]
  if (!first || wasAlreadyAdded(feed, first)) return true
  state.newest ??= first

  let filters = await getFilters(state, feed.id)
  let readings = new Map<string, NewPost['reading']>()
  let accepted: OriginPost[] = []
  for (let origin of posts) {
    if (wasAlreadyAdded(feed, origin)) {
      break
    }
    if (state.known?.has(origin.originId)) continue
    let reading = filters(origin) ?? feed.reading
    if (reading !== 'delete') {
      accepted.push(origin)
      readings.set(origin.originId, reading)
    }
  }
  for (let origin of await linkThreads(state.task, feed, accepted)) {
    let reading = readings.get(origin.originId) ?? feed.reading
    state.adding.push(processOriginPost(origin, { feedId: feed.id }, reading))
    state.known?.add(origin.originId)
  }
  return true
}

/**
 * Home timeline puts posts of authors with virtual feed of this account
 * to the feed, skips authors with normal feed, since the feed loads them
 * itself, and keeps the rest in the account.
 */
async function collectAccountPage(
  state: TargetRefresh,
  accountId: string
): Promise<boolean> {
  let account = await loadAccount(accountId)
  if (!account) return false

  let posts = state.page
  let first = posts[0]
  if (!first || wasAlreadyAdded(account, first)) return true
  state.newest ??= first

  state.feeds ??= await loadFeedsByUrls()
  let groups = new Map<string, [FeedByUrl | undefined, OriginPost[]]>()
  let readings = new Map<string, NewPost['reading']>()
  for (let origin of posts) {
    if (wasAlreadyAdded(account, origin)) break
    if (state.known?.has(origin.originId)) continue
    let url = origin.repostedBy?.url ?? origin.author?.url
    let feed = url ? state.feeds.get(url) : undefined
    if (feed && feed.accountId !== account.id) continue
    let reading: NewPost['reading'] | 'delete' = 'fast'
    if (feed) {
      reading = (await getFilters(state, feed.id))(origin) ?? feed.reading
      if (reading === 'delete') continue
      if (!state.virtual.has(feed.id)) state.virtual.set(feed.id, origin)
    }
    readings.set(origin.originId, reading)
    let key = feed?.id ?? account.id
    let group = groups.get(key) ?? [feed, []]
    group[1].push(origin)
    groups.set(key, group)
  }

  for (let [id, [feed, accepted]] of groups) {
    let linked = await linkThreads(
      state.task,
      // Timeline’s post IDs are from the account’s server
      { id, loader: feed?.loader ?? account.service, url: account.server },
      accepted
    )
    let authors = new Map<string, PostAuthor>()
    for (let origin of linked) {
      if (origin.threadId && origin.author) {
        authors.set(origin.threadId, origin.author)
      }
    }
    for (let origin of linked) {
      let reading = readings.get(origin.originId) ?? feed?.reading ?? 'fast'
      let saved = { ...origin }
      if (feed) {
        // The feed is the author of own posts
        if (!saved.repostedBy) delete saved.author
        state.adding.push(
          processOriginPost(saved, { feedId: feed.id }, reading)
        )
      } else {
        // Restored thread start has no author, but the thread has one author
        saved.author ??= authors.get(origin.threadId ?? '')
        state.adding.push(processOriginPost(saved, { accountId: id }, reading))
      }
      state.known?.add(origin.originId)
    }
  }
  return true
}

function collectPage(state: TargetRefresh): Promise<boolean> {
  if ('feed' in state.target) {
    return collectFeedPage(state, state.target.feed.id)
  } else {
    return collectAccountPage(state, state.target.account.id)
  }
}

/**
 * Time of the current refresh and feeds, which got no new posts. Their marker
 * is written by a single action in the end: without new posts the interrupted
 * refresh can not create duplicates, so the marker can wait.
 */
let refreshedAt = 0
let untouched = new Map<null | number, string[]>()
let untouchedAccounts: string[] = []

async function finishTarget(state: TargetRefresh): Promise<void> {
  let { newest, target } = state
  let adding = await withoutDeletedPosts(state.adding)
  let { accounts, feeds, posts } = getTables()
  if ('feed' in target) {
    let frequency = getPostsFrequency(state.pages)
    let first = state.page[0]
    let lastPublishedAt = first && getSortedAt(first)
    if (newest) {
      await getCrdt().batch(() => {
        if (adding.length > 0) void posts.create(adding)
        void feeds.update(target.feed.id, {
          frequency,
          lastOriginId: newest.originId,
          lastPublishedAt: getSortedAt(newest),
          refreshedAt
        })
      })
    } else if (!target.feed.lastPublishedAt && lastPublishedAt) {
      await feeds.update(target.feed.id, {
        frequency,
        lastPublishedAt,
        refreshedAt
      })
    } else {
      let key =
        frequency === undefined || frequency === target.feed.frequency
          ? null
          : frequency
      untouched.set(key, [...(untouched.get(key) ?? []), target.feed.id])
    }
  } else {
    await getCrdt().batch(() => {
      if (adding.length > 0) void posts.create(adding)
      if (newest) {
        void accounts.update(target.account.id, {
          lastOriginId: newest.originId,
          lastPublishedAt: getSortedAt(newest),
          refreshedAt
        })
      }
      for (let [feedId, origin] of state.virtual) {
        void feeds.update(feedId, {
          lastOriginId: origin.originId,
          lastPublishedAt: getSortedAt(origin)
        })
      }
    })
    if (!newest) untouchedAccounts.push(target.account.id)
  }
  let fast = adding.filter(post => post.reading === 'fast').length
  increaseKey(refreshStatistics, 'foundFast', fast)
  increaseKey(refreshStatistics, 'foundSlow', adding.length - fast)
}

function loadKnown(target: RefreshTarget): Promise<string[]> {
  if ('feed' in target) {
    return loadPostOriginIdsByFeed(target.feed.id)
  } else {
    return loadPostOriginIdsByAccount(target.account.id)
  }
}

async function processPage(
  state: TargetRefresh
): Promise<QueueCallback | void> {
  sortPage(state.page)
  let marker = getMarker(state.target)
  let enough = state.page.some(i => wasAlreadyAdded(marker, i))
  let more =
    !enough &&
    state.pages.get().hasNext &&
    // Home timeline goes back for months, so the first refresh of the account
    // takes only the newest page
    !(
      'account' in state.target &&
      !marker.lastOriginId &&
      !marker.lastPublishedAt
    )

  // Future posts are newer than the marker on every refresh,
  // so they are found only by origin ID
  let first = state.page[0]
  if (more || (first && !wasAlreadyAdded(marker, first))) {
    state.known ??= new Set(await loadKnown(state.target))
  }
  let exists = await collectPage(state)

  if (exists && more) {
    return async () => {
      state.page = await state.pages.next()
      let error = state.pages.get().error
      if (error) throw error
      return processPage(state)
    }
  } else {
    if (exists) await finishTarget(state)
    increaseKey(refreshStatistics, 'processedFeeds')
  }
}

function loadTargetPosts(target: RefreshTarget, task: DownloadTask): PostsList {
  if ('feed' in target) {
    return getFeedLatestPosts(target.feed, task)
  } else {
    let { account } = target
    return loaders[account.service].account!.getTimeline(
      task,
      getAccountAuth(account),
      account.refreshedAt ?? undefined
    )
  }
}

function createState(
  target: RefreshTarget,
  pages: PostsList,
  task: DownloadTask
): TargetRefresh {
  return {
    adding: [],
    feeds: undefined,
    filters: new Map(),
    known: undefined,
    newest: undefined,
    page: pages.get().list,
    pages,
    target,
    task,
    virtual: new Map()
  }
}

/**
 * Feed switched to the account will get only new posts from the home
 * timeline, so it loads posts between its last refresh and the switch.
 */
export async function loadRecentPosts(
  feedId: string,
  task = createDownloadTask()
): Promise<void> {
  let feed = await loadFeed(feedId)
  if (!feed) return
  let pages = getFeedLatestPosts(feed, task)
  if (pages.get().isLoading) await pages.loading
  let error = pages.get().error
  if (error) throw error
  let state = createState({ feed }, pages, task)
  sortPage(state.page)
  await collectFeedPage(state, feedId)
  let { newest } = state
  if (!newest) return
  let adding = await withoutDeletedPosts(state.adding)
  let { feeds, posts } = getTables()
  await getCrdt().batch(() => {
    if (adding.length > 0) void posts.create(adding)
    void feeds.update(feedId, {
      lastOriginId: newest.originId,
      lastPublishedAt: getSortedAt(newest)
    })
  })
}

/**
 * `auto` refresh is for the app start and the return to the app.
 * It respects user settings and skips if other tab did it recently.
 */
export async function refreshPosts({ auto = false } = {}): Promise<void> {
  if (isRefreshing.get()) return
  if (auto) {
    if (!canUseNetwork(autoRefresh.get())) return
    if (Date.now() - lastRefresh.get() < 5 * 60_000) return
  }
  if (doneTimeout) {
    clearTimeout(doneTimeout)
    doneTimeout = undefined
  }
  refreshStatus.set('refreshing')
  refreshErrors.set([])
  refreshStatistics.set({ ...DEFAULT_REFRESH_STATISTICS, initializing: true })
  mediaStatistics.set({ ...DEFAULT_MEDIA_STATISTICS })
  mediaErrors.set([])
  lastRefresh.set(Date.now())

  // Other device could already load these posts and move feed markers
  await waitSyncOrOffline()
  if (!isRefreshing.get()) return

  refreshedAt = Math.round(Date.now() / 1000)
  untouched = new Map()
  untouchedAccounts = []
  await waitLoading(syncedSettingsLoading)
  let [feeds, accounts] = await Promise.all([
    loadFeedsForRefresh(),
    loadAccounts()
  ])
  if (auto && (nightLocked.get() || feeds.length + accounts.length === 0)) {
    refreshStatus.set('start')
    return
  }
  let maxAge = fastPostsMaxAge.get()
  if (maxAge > 0) await deleteFastPostsBefore(refreshedAt - maxAge)
  let targets: RefreshTarget[] = [
    ...accounts.map(account => ({ account })),
    ...feeds.map(feed => ({ feed }))
  ]
  refreshStatistics.set({
    ...refreshStatistics.get(),
    initializing: false,
    totalFeeds: targets.length
  })

  queue = createQueue(targets)
  await queue.start(
    6,
    target => {
      return async task => {
        let pages = loadTargetPosts(target, task)
        if (pages.get().isLoading) await pages.loading
        let error = pages.get().error
        if (error) throw error
        return processPage(createState(target, pages, task))
      }
    },
    {
      onRequestError() {
        increaseKey(refreshStatistics, 'errorRequests')
      },
      onTaskFail(target, error) {
        getEnvironment().warn(error)
        refreshErrors.set([
          ...refreshErrors.get(),
          'feed' in target
            ? { error, feed: target.feed }
            : {
                account: { id: target.account.id, title: target.account.title },
                error
              }
        ])
        refreshStatus.set('refreshingError')
        increaseKey(refreshStatistics, 'errorFeeds')
        increaseKey(refreshStatistics, 'processedFeeds')
      }
    }
  )

  for (let [frequency, ids] of untouched) {
    await changeFeed(
      ids,
      frequency === null ? { refreshedAt } : { frequency, refreshedAt }
    )
  }
  if (untouchedAccounts.length > 0) {
    await getTables().accounts.update(untouchedAccounts, { refreshedAt })
  }

  if (isRefreshing.get()) {
    try {
      await syncMediaCache()
    } catch (e) {
      getEnvironment().warn(e)
    }
  }

  lastRefresh.set(Date.now())
  if (refreshStatus.get() === 'refreshingError') {
    refreshStatus.set('error')
  } else {
    refreshStatus.set('done')
    doneTimeout = setTimeout(() => {
      refreshStatus.set('start')
    }, 1000)
  }
}

onClient(() =>
  effect(openedDatabase, db => {
    if (db) void refreshPosts({ auto: true })
  })
)

export function stopRefreshing(): void {
  if (!isRefreshing.get()) return
  refreshStatus.set('start')
  queue.stop()
  stopMediaCache()
}
