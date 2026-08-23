import { atom, computed, map } from 'nanostores'

import { getEnvironment } from './environment.ts'
import {
  changeFeed,
  type FeedValue,
  getFeedLatestPosts,
  loadFeed,
  loadFeedsForRefresh,
  type RefreshFeed
} from './feed.ts'
import { type FilterChecker, loadFilterChecker } from './filter.ts'
import { createQueue } from './lib/queue.ts'
import { increaseKey } from './lib/stores.ts'
import {
  addPost,
  loadPostOriginIdsByFeed,
  type NewPost,
  type OriginPost,
  processOriginPost
} from './post.ts'
import type { PostsList } from './posts-list.ts'

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

export type RefreshError = { error: Error; feed: RefreshFeed }

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

let queue = createQueue<RefreshFeed>([])

interface FeedRefresh {
  feed: RefreshFeed
  filters: FilterChecker | undefined
  known: Set<string> | undefined
  newest: OriginPost | undefined
  pages: PostsList
}

function wasAlreadyAdded(
  feed: Pick<FeedValue, 'lastOriginId' | 'lastPublishedAt'>,
  origin: OriginPost
): boolean {
  if (origin.publishedAt && feed.lastPublishedAt) {
    return origin.publishedAt <= feed.lastPublishedAt
  } else {
    return origin.originId === feed.lastOriginId
  }
}

function sortPage(posts: OriginPost[]): void {
  if (posts[0]?.publishedAt) {
    posts.sort((a, b) => {
      return (b.publishedAt ?? 0) - (a.publishedAt ?? 0)
    })
  }
}

/**
 * Write a single page of the feed. Returns `false` if the feed was deleted
 * during the refresh.
 */
async function writePage(state: FeedRefresh): Promise<boolean> {
  let feed = await loadFeed(state.feed.id)
  if (!feed) return false

  let posts = state.pages.get().list
  let first = posts[0]
  if (!first || wasAlreadyAdded(feed, first)) return true
  state.newest ??= first

  state.filters ??= await loadFilterChecker(feed.id)
  let adding: NewPost[] = []
  let fast = 0
  let slow = 0
  for (let origin of posts) {
    if (wasAlreadyAdded(feed, origin)) {
      break
    }
    if (state.known?.has(origin.originId)) continue
    let reading = state.filters(origin) ?? feed.reading
    if (reading !== 'delete') {
      adding.push(processOriginPost(origin, feed.id, reading))
      state.known?.add(origin.originId)
      if (reading === 'fast') {
        fast += 1
      } else {
        slow += 1
      }
    }
  }
  await addPost(adding)
  increaseKey(refreshStatistics, 'foundFast', fast)
  increaseKey(refreshStatistics, 'foundSlow', slow)
  return true
}

/**
 * Time of the current refresh and feeds, which got no new posts. Their marker
 * is written by a single action in the end: without new posts the interrupted
 * refresh can not create duplicates, so the marker can wait.
 */
let refreshedAt = 0
let untouched: string[] = []

async function finishFeed(state: FeedRefresh): Promise<void> {
  if (state.newest) {
    await changeFeed(state.feed.id, {
      lastOriginId: state.newest.originId,
      lastPublishedAt: state.newest.publishedAt,
      refreshedAt
    })
  } else {
    untouched.push(state.feed.id)
  }
}

async function processPage(state: FeedRefresh): Promise<void> {
  sortPage(state.pages.get().list)
  let enough = state.pages.get().list.some(i => wasAlreadyAdded(state.feed, i))
  let more = !enough && state.pages.get().hasNext

  // The marker is written only after the last page, so a failure in the middle
  // will return to the same pages on the next refresh.
  if (more) {
    state.known ??= new Set(await loadPostOriginIdsByFeed(state.feed.id))
  }
  let alive = await writePage(state)

  if (alive && more) {
    queue.add(state.feed, async () => {
      await state.pages.next()
      let error = state.pages.get().error
      if (error) throw error
      await processPage(state)
    })
  } else {
    if (alive) await finishFeed(state)
    increaseKey(refreshStatistics, 'processedFeeds')
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
  let feeds = await loadFeedsForRefresh()
  refreshStatistics.set({
    ...refreshStatistics.get(),
    initializing: false,
    totalFeeds: feeds.length
  })

  queue = createQueue(feeds)
  await queue.start(
    6,
    feed => {
      return async task => {
        let pages = getFeedLatestPosts(feed, task)
        if (pages.get().isLoading) await pages.loading
        let error = pages.get().error
        if (error) throw error
        await processPage({
          feed,
          filters: undefined,
          known: undefined,
          newest: undefined,
          pages
        })
      }
    },
    {
      onRequestError() {
        increaseKey(refreshStatistics, 'errorRequests')
      },
      onTaskFail(feed, error) {
        getEnvironment().warn(error)
        refreshErrors.set([...refreshErrors.get(), { error, feed }])
        refreshStatus.set('refreshingError')
        increaseKey(refreshStatistics, 'errorFeeds')
        increaseKey(refreshStatistics, 'processedFeeds')
      }
    }
  )

  if (untouched.length > 0) await changeFeed(untouched, { refreshedAt })

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
