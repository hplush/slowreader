import { atom, computed, map } from 'nanostores'

import {
  type AccountValue,
  getAccountAuth,
  loadAccount,
  loadAccounts
} from './account.ts'
import { getEnvironment } from './environment.ts'
import {
  changeFeed,
  type FeedByUrl,
  type FeedValue,
  getFeedLatestPosts,
  loadFeed,
  loadFeedsByUrls,
  loadFeedsForRefresh,
  type RefreshFeed
} from './feed.ts'
import { type FilterChecker, loadFilterChecker } from './filter.ts'
import { createDownloadTask, type DownloadTask } from './lib/download.ts'
import { createQueue } from './lib/queue.ts'
import { increaseKey } from './lib/stores.ts'
import { loaders } from './loader/index.ts'
import {
  addPost,
  getSortedAt,
  loadPostOriginIdsByAccount,
  loadPostOriginIdsByFeed,
  type NewPost,
  type OriginPost,
  type PostAuthor,
  processOriginPost
} from './post.ts'
import type { PostsList } from './posts-list.ts'
import { getTables } from './schema.ts'
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
export type RefreshError = {
  error: Error
  feed: Pick<RefreshFeed, 'id' | 'title' | 'url'>
}

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

type RefreshTarget = { account: AccountValue } | { feed: RefreshFeed }

let queue = createQueue<RefreshTarget>([])

interface TargetRefresh {
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

type Found = { fast: number; slow: number }

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

function countReading(found: Found, reading: NewPost['reading']): void {
  if (reading === 'fast') {
    found.fast += 1
  } else {
    found.slow += 1
  }
}

function sortPage(posts: OriginPost[]): void {
  if (posts[0] && getSortedAt(posts[0])) {
    posts.sort((a, b) => {
      return (getSortedAt(b) ?? 0) - (getSortedAt(a) ?? 0)
    })
  }
}

/**
 * Write a single page of the feed. Returns `false` if the feed was deleted
 * during the refresh.
 */
async function writeFeedPage(
  state: TargetRefresh,
  feedId: string
): Promise<false | Found> {
  let feed = await loadFeed(feedId)
  if (!feed) return false

  let found = { fast: 0, slow: 0 }
  let posts = state.page
  let first = posts[0]
  if (!first || wasAlreadyAdded(feed, first)) return found
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
  let adding: NewPost[] = []
  for (let origin of await linkThreads(state.task, feed, accepted)) {
    let reading = readings.get(origin.originId) ?? feed.reading
    adding.push(processOriginPost(origin, { feedId: feed.id }, reading))
    state.known?.add(origin.originId)
    countReading(found, reading)
  }
  await addPost(adding)
  return found
}

/**
 * Home timeline puts posts of authors with virtual feed of this account
 * to the feed, skips authors with normal feed, since the feed loads them
 * itself, and keeps the rest in the account.
 */
async function writeAccountPage(
  state: TargetRefresh,
  accountId: string
): Promise<false | Found> {
  let account = await loadAccount(accountId)
  if (!account) return false

  let found = { fast: 0, slow: 0 }
  let posts = state.page
  let first = posts[0]
  if (!first || wasAlreadyAdded(account, first)) return found
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

  let adding: NewPost[] = []
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
        adding.push(processOriginPost(saved, { feedId: feed.id }, reading))
      } else {
        // Restored thread start has no author, but the thread has one author
        saved.author ??= authors.get(origin.threadId ?? '')
        adding.push(processOriginPost(saved, { accountId: id }, reading))
      }
      state.known?.add(origin.originId)
      countReading(found, reading)
    }
  }
  await addPost(adding)
  return found
}

function writePage(state: TargetRefresh): Promise<false | Found> {
  if ('feed' in state.target) {
    return writeFeedPage(state, state.target.feed.id)
  } else {
    return writeAccountPage(state, state.target.account.id)
  }
}

/**
 * Time of the current refresh and feeds, which got no new posts. Their marker
 * is written by a single action in the end: without new posts the interrupted
 * refresh can not create duplicates, so the marker can wait.
 */
let refreshedAt = 0
let untouched: string[] = []
let untouchedAccounts: string[] = []

async function finishTarget(state: TargetRefresh): Promise<void> {
  let { newest, target } = state
  if ('feed' in target) {
    if (newest) {
      await changeFeed(target.feed.id, {
        lastOriginId: newest.originId,
        lastPublishedAt: getSortedAt(newest),
        refreshedAt
      })
    } else {
      untouched.push(target.feed.id)
    }
  } else {
    if (newest) {
      await getTables().accounts.update(target.account.id, {
        lastOriginId: newest.originId,
        lastPublishedAt: getSortedAt(newest),
        refreshedAt
      })
    } else {
      untouchedAccounts.push(target.account.id)
    }
    for (let [feedId, origin] of state.virtual) {
      await changeFeed(feedId, {
        lastOriginId: origin.originId,
        lastPublishedAt: getSortedAt(origin)
      })
    }
  }
}

function loadKnown(target: RefreshTarget): Promise<string[]> {
  if ('feed' in target) {
    return loadPostOriginIdsByFeed(target.feed.id)
  } else {
    return loadPostOriginIdsByAccount(target.account.id)
  }
}

async function processPage(state: TargetRefresh): Promise<void> {
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

  // The marker is written only after the last page, so a failure in the middle
  // will return to the same pages on the next refresh.
  if (more) {
    state.known ??= new Set(await loadKnown(state.target))
  }
  let found = await writePage(state)
  if (found) {
    increaseKey(refreshStatistics, 'foundFast', found.fast)
    increaseKey(refreshStatistics, 'foundSlow', found.slow)
  }

  if (found && more) {
    queue.add(state.target, async () => {
      state.page = await state.pages.next()
      let error = state.pages.get().error
      if (error) throw error
      await processPage(state)
    })
  } else {
    if (found) await finishTarget(state)
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
  await writeFeedPage(state, feedId)
  if (state.newest) {
    await changeFeed(feedId, {
      lastOriginId: state.newest.originId,
      lastPublishedAt: getSortedAt(state.newest)
    })
  }
}

export async function refreshPosts(): Promise<void> {
  if (isRefreshing.get()) return
  if (doneTimeout) {
    clearTimeout(doneTimeout)
    doneTimeout = undefined
  }
  refreshStatus.set('refreshing')
  refreshErrors.set([])
  refreshStatistics.set({ ...DEFAULT_REFRESH_STATISTICS, initializing: true })

  refreshedAt = Math.round(Date.now() / 1000)
  untouched = []
  untouchedAccounts = []
  let [feeds, accounts] = await Promise.all([
    loadFeedsForRefresh(),
    loadAccounts()
  ])
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
        await processPage(createState(target, pages, task))
      }
    },
    {
      onRequestError() {
        increaseKey(refreshStatistics, 'errorRequests')
      },
      onTaskFail(target, error) {
        getEnvironment().warn(error)
        let feed =
          'feed' in target
            ? target.feed
            : {
                id: target.account.id,
                title: target.account.title,
                url: target.account.url
              }
        refreshErrors.set([...refreshErrors.get(), { error, feed }])
        refreshStatus.set('refreshingError')
        increaseKey(refreshStatistics, 'errorFeeds')
        increaseKey(refreshStatistics, 'processedFeeds')
      }
    }
  )

  if (untouched.length > 0) await changeFeed(untouched, { refreshedAt })
  if (untouchedAccounts.length > 0) {
    await getTables().accounts.update(untouchedAccounts, { refreshedAt })
  }

  if (refreshStatus.get() === 'refreshingError') {
    refreshStatus.set('error')
  } else {
    refreshStatus.set('done')
    doneTimeout = setTimeout(() => {
      refreshStatus.set('start')
    }, 1000)
  }
}

export function stopRefreshing(): void {
  if (!isRefreshing.get()) return
  refreshStatus.set('start')
  queue.stop()
}
