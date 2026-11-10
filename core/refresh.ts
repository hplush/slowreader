import { atom, computed, effect, map } from 'nanostores'

import {
  type AccountValue,
  getAccountAuth,
  loadAccount,
  loadAccounts,
  toVirtualFeed
} from './account.ts'
import { onClient, waitSyncOrOffline } from './client.ts'
import { getEnvironment } from './environment.ts'
import {
  changeFeed,
  type FeedByUrl,
  type FeedValue,
  getFeedLatestPosts,
  getFeedReading,
  loadFeed,
  loadFeedsByUrls,
  loadFeedsForRefresh,
  type NewFeed
} from './feed.ts'
import { type FilterChecker, loadFilterChecker } from './filter.ts'
import { createDownloadTask, type DownloadTask } from './lib/download.ts'
import { canUseNetwork } from './lib/network.ts'
import { createQueue, type QueueCallback } from './lib/queue.ts'
import { increaseKey, waitLoading } from './lib/stores.ts'
import { getOriginKey, loaders } from './loader/index.ts'
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
  type LoadedAuthor,
  type NewPost,
  type OriginPost,
  type PostAuthor,
  processOriginPost,
  withoutDeletedPosts
} from './post.ts'
import { getPostsFrequency, type PostsList } from './posts-list.ts'
import {
  refreshLock,
  releaseRefreshLock,
  requestRefreshLock
} from './refresh-lock.ts'
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
  | 'other'
  | 'refreshing'
  | 'refreshingError'
  | 'start'

export const refreshStatus = atom<refreshStatusValue>('start')

refreshLock.listen(lock => {
  let status = refreshStatus.get()
  if (lock === 'other' && !status.startsWith('refreshing')) {
    refreshStatus.set('other')
  } else if (lock !== 'other' && status === 'other') {
    refreshStatus.set('start')
  }
})

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

export type RefreshTotalProgress =
  | { stage: 'media' | 'onlyPosts' | 'posts'; value: number }
  | { stage: 'other' | 'waiting' }

export const refreshTotalProgress = computed(
  [
    refreshStatus,
    refreshStatistics,
    refreshProgress,
    mediaProgress,
    cacheMediaReading,
    cacheImages,
    cacheVideos
  ],
  (
    status,
    stats,
    feeds,
    media,
    reading,
    images,
    videos
  ): RefreshTotalProgress => {
    if (status === 'other') return { stage: 'other' }
    if (stats.initializing) return { stage: 'waiting' }
    let checked = stats.totalFeeds === 0 ? 1 : feeds
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
  let feedReading = getFeedReading(
    feed,
    feed.accountId ? await loadAccount(feed.accountId) : undefined
  )
  let readings = new Map<string, NewPost['reading']>()
  let accepted: OriginPost[] = []
  for (let origin of posts) {
    if (wasAlreadyAdded(feed, origin)) {
      break
    }
    if (state.known?.has(origin.originId)) continue
    let reading = filters(origin) ?? feedReading
    if (reading !== 'delete') {
      accepted.push(origin)
      readings.set(origin.originId, reading)
    }
  }
  for (let origin of await linkThreads(state.task, feed, accepted)) {
    let reading = readings.get(origin.originId) ?? feedReading
    state.adding.push(processOriginPost(origin, { feedId: feed.id }, reading))
    state.known?.add(origin.originId)
  }
  return true
}

function withoutLoaderData(author: LoadedAuthor): PostAuthor {
  let saved = { ...author }
  delete saved.loaderData
  return saved
}

/**
 * Home timeline puts posts to the virtual feeds of this account and creates
 * them for new authors. It skips authors with normal feed, since the feed
 * loads them itself. User’s own posts stay in the account.
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
  let created: NewFeed[] = []
  let renamed = new Map<string, string>()
  for (let origin of posts) {
    if (wasAlreadyAdded(account, origin)) break
    if (state.known?.has(origin.originId)) continue
    let author = origin.repostedBy ?? origin.author
    let url = author?.url
    let originKey = getOriginKey(account.service, author?.loaderData)
    let feed =
      (originKey && state.feeds.get(originKey)) ||
      (url ? state.feeds.get(url) : undefined)
    if (feed && url && feed.url !== url) renamed.set(feed.id, url)
    let own = url === account.url
    if (!feed && !own && origin.followedTag) {
      originKey = undefined
      author = origin.followedTag
      url = origin.followedTag.url
      feed = state.feeds.get(origin.followedTag.url)
    }
    if (!feed && url && !own) {
      let virtual = toVirtualFeed(account, { ...author!, url })
      created.push(virtual)
      feed = {
        accountId: account.id,
        id: virtual.id,
        loader: account.service,
        reading: null,
        url
      }
      state.feeds.set(url, feed)
      if (originKey) state.feeds.set(originKey, feed)
    }
    if (feed && feed.accountId !== account.id) continue
    let reading: NewPost['reading'] | 'delete' = 'fast'
    if (feed) {
      reading =
        (await getFilters(state, feed.id))(origin) ??
        getFeedReading(feed, account)
      if (reading === 'delete') continue
      if (!state.virtual.has(feed.id)) state.virtual.set(feed.id, origin)
    }
    readings.set(origin.originId, reading)
    let key = feed?.id ?? account.id
    let group = groups.get(key) ?? [feed, []]
    let saved = { ...origin }
    delete saved.followedTag
    if (saved.author) saved.author = withoutLoaderData(saved.author)
    if (saved.repostedBy) saved.repostedBy = withoutLoaderData(saved.repostedBy)
    group[1].push(saved)
    groups.set(key, group)
  }
  await getTables().feeds.create(created)

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
      let reading =
        readings.get(origin.originId) ??
        (feed ? getFeedReading(feed, account) : 'fast')
      let saved = { ...origin }
      // Restored thread start has no author, but the thread has one author
      saved.author ??= authors.get(origin.threadId ?? '')
      if (feed) {
        // The feed is the author of own posts, but not of hashtag’s posts
        let url = saved.author?.url
        if (url === feed.url || url === renamed.get(feed.id)) {
          delete saved.author
        }
        state.adding.push(
          processOriginPost(saved, { feedId: feed.id }, reading)
        )
      } else {
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
  if (!(await requestRefreshLock(stopRefreshing))) {
    refreshStatus.set(refreshLock.get() === 'other' ? 'other' : 'start')
    return
  }
  if (!isRefreshing.get()) {
    releaseRefreshLock()
    return
  }

  refreshedAt = Math.round(Date.now() / 1000)
  untouched = new Map()
  untouchedAccounts = []
  await waitLoading(syncedSettingsLoading)
  let [feeds, accounts] = await Promise.all([
    loadFeedsForRefresh(),
    loadAccounts()
  ])
  if (auto && (nightLocked.get() || feeds.length + accounts.length === 0)) {
    releaseRefreshLock()
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
  // Every device caches own media
  releaseRefreshLock()

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
  releaseRefreshLock()
  queue.stop()
  stopMediaCache()
}
