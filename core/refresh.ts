import { loadValue } from '@logux/client'
import { atom, computed, map } from 'nanostores'

import { createDownloadTask, type DownloadTask } from './download.ts'
import {
  changeFeed,
  type FeedValue,
  getFeed,
  getFeedLatestPosts,
  getFeeds
} from './feed.ts'
import { type FilterChecker, loadFilters } from './filter.ts'
import { createQueue, type Queue, retryOnError } from './lib/queue.ts'
import { increaseKey } from './lib/stores.ts'
import { addPost, type OriginPost, processOriginPost } from './post.ts'

export const isRefreshing = atom(false)

export const DEFAULT_REFRESH_STATISTICS = {
  errors: 0,
  foundFast: 0,
  foundSlow: 0,
  initializing: false,
  missedFeeds: 0,
  processedFeeds: 0,
  totalFeeds: 0
}

export type RefreshStatistics = typeof DEFAULT_REFRESH_STATISTICS

export const refreshStatistics = map({ ...DEFAULT_REFRESH_STATISTICS })

export const refreshProgress = computed(refreshStatistics, stats => {
  if (stats.initializing || stats.totalFeeds === 0) {
    return 0
  } else {
    return Math.floor((stats.processedFeeds / stats.totalFeeds) * 100) / 100
  }
})

let task: DownloadTask
let queue: Queue<{ feed: FeedValue }>

/**
 * Determines if a post was already added to a feed by comparing timestamps
 * or origin IDs to prevent duplicate posts during refresh
 */
function wasAlreadyAdded(feed: FeedValue, origin: OriginPost): boolean {
  if (origin.publishedAt && feed.lastPublishedAt) {
    return origin.publishedAt <= feed.lastPublishedAt
  } else {
    return origin.originId === feed.lastOriginId
  }
}

export async function refreshPosts(): Promise<void> {
  if (isRefreshing.get()) return
  isRefreshing.set(true)
  refreshStatistics.set({ ...DEFAULT_REFRESH_STATISTICS, initializing: true })

  task = createDownloadTask()
  let feeds = await loadValue(getFeeds())
  refreshStatistics.set({
    ...refreshStatistics.get(),
    initializing: false,
    totalFeeds: feeds.list.length
  })

  queue = createQueue(feeds.list.map(feed => ({ payload: feed, type: 'feed' })))
  await queue.start(4, {
    async feed(feed) {
      let feedStore = getFeed(feed.id)
      let pages = getFeedLatestPosts(feed, task)
      let filters: FilterChecker | undefined
      let firstNew: OriginPost | undefined

      async function end(): Promise<void> {
        if (firstNew && !feedStore.deleted) {
          await changeFeed(feed.id, {
            lastOriginId: firstNew.originId,
            lastPublishedAt: firstNew.publishedAt
          })
        }
        increaseKey(refreshStatistics, 'processedFeeds')
      }

      while (pages.get().hasNext) {
        let posts = await retryOnError(
          () => pages.next(),
          () => {
            increaseKey(refreshStatistics, 'errors')
          }
        )
        if (posts === 'error') {
          increaseKey(refreshStatistics, 'missedFeeds')
          await end()
          return
        } else if (posts === 'abort') {
          await end()
          return
        } else {
          if (posts[0]) {
            if (posts[0].publishedAt) {
              posts = posts.sort((a, b) => {
                return (b.publishedAt ?? 0) - (a.publishedAt ?? 0)
              })
            }
            if (!firstNew && !wasAlreadyAdded(feed, posts[0]!)) {
              firstNew = posts[0]
            }
          }
          if (!filters) {
            filters = await loadFilters({ feedId: feed.id })
          }
          for (let origin of posts) {
            if (feedStore.deleted || wasAlreadyAdded(feed, origin)) {
              await end()
              return
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
        }
      }
      await end()
    }
  })
  isRefreshing.set(false)
}

export function stopRefreshing(): void {
  if (!isRefreshing.get()) return
  isRefreshing.set(false)
  queue.stop()
  task.destroy()
}
