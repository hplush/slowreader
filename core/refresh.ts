import { loadValue } from '@logux/client'
import { atom, computed, map } from 'nanostores'

import {
  changeFeed,
  type FeedValue,
  getFeed,
  getFeedLatestPosts,
  getFeeds
} from './feed.ts'
import { loadFilters } from './filter.ts'
import { createQueue } from './lib/queue.ts'
import { increaseKey } from './lib/stores.ts'
import { addPost, type OriginPost, processOriginPost } from './post.ts'
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

export type RefreshError = { error: Error; feed: FeedValue }

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

let queue = createQueue<FeedValue>([])

function wasAlreadyAdded(feed: FeedValue, origin: OriginPost): boolean {
  if (origin.publishedAt && feed.lastPublishedAt) {
    return origin.publishedAt <= feed.lastPublishedAt
  } else {
    return origin.originId === feed.lastOriginId
  }
}

async function addPosts(feed: FeedValue, posts: OriginPost[]): Promise<void> {
  let first = posts[0]
  if (!first) return

  if (first.publishedAt) {
    posts = posts.sort((a, b) => {
      return (b.publishedAt ?? 0) - (a.publishedAt ?? 0)
    })
    first = posts[0]!
  }
  if (wasAlreadyAdded(feed, first)) return

  let filters = await loadFilters({ feedId: feed.id })
  for (let origin of posts) {
    if (wasAlreadyAdded(feed, origin)) {
      break
    }
    let reading = filters(origin) ?? feed.reading
    if (reading !== 'delete') {
      await addPost(processOriginPost(origin, feed.id, reading))
      if (reading === 'fast') {
        increaseKey(refreshStatistics, 'foundFast')
      } else {
        increaseKey(refreshStatistics, 'foundSlow')
      }
    }
  }

  await changeFeed(feed.id, {
    lastOriginId: first.originId,
    lastPublishedAt: first.publishedAt
  })
}

async function checkForNextPage(
  feed: FeedValue,
  pages: PostsList
): Promise<void> {
  let enough = pages.get().list.some(i => wasAlreadyAdded(feed, i))
  if (!enough && pages.get().hasNext) {
    queue.add(feed, async () => {
      await pages.next()
      let error = pages.get().error
      if (error) throw error
      checkForNextPage(feed, pages)
    })
  } else {
    if (!getFeed(feed.id).deleted) {
      await addPosts(feed, pages.get().list)
    }
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

  let feeds = await loadValue(getFeeds())
  refreshStatistics.set({
    ...refreshStatistics.get(),
    initializing: false,
    totalFeeds: feeds.list.length
  })

  queue = createQueue(feeds.list)
  await queue.start(
    6,
    feed => {
      return async task => {
        let pages = getFeedLatestPosts(feed, task)
        if (pages.get().isLoading) await pages.loading
        let error = pages.get().error
        if (error) throw error
        await checkForNextPage(feed, pages)
      }
    },
    {
      onRequestError() {
        increaseKey(refreshStatistics, 'errorRequests')
      },
      onTaskFail(feed, error) {
        refreshErrors.set([...refreshErrors.get(), { error, feed }])
        refreshStatus.set('refreshingError')
        increaseKey(refreshStatistics, 'errorFeeds')
        increaseKey(refreshStatistics, 'processedFeeds')
      }
    }
  )

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
