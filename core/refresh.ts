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
import { increaseKey, readonlyExport } from './lib/stores.ts'
import { addPost, type OriginPost, processOriginPost } from './post.ts'

let $isRefreshing = atom(false)
export const isRefreshing = readonlyExport($isRefreshing)

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

let $stats = map({ ...DEFAULT_REFRESH_STATISTICS })
export const refreshStatistics = readonlyExport($stats)

export const refreshProgress = computed($stats, stats => {
  if (stats.initializing || stats.totalFeeds === 0) {
    return 0
  } else {
    return Math.floor((stats.processedFeeds / stats.totalFeeds) * 100) / 100
  }
})

let task: DownloadTask
let queue: Queue<{ feed: FeedValue }>

function wasAlreadyAdded(feed: FeedValue, origin: OriginPost): boolean {
  if (origin.publishedAt && feed.lastPublishedAt) {
    return origin.publishedAt <= feed.lastPublishedAt
  } else {
    return origin.originId === feed.lastOriginId
  }
}

export async function refreshPosts(): Promise<void> {
  if ($isRefreshing.get()) return
  $isRefreshing.set(true)
  $stats.set({ ...DEFAULT_REFRESH_STATISTICS, initializing: true })

  task = createDownloadTask()
  let feeds = await loadValue(getFeeds())
  $stats.set({
    ...$stats.get(),
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
        increaseKey($stats, 'processedFeeds')
      }

      while (pages.get().hasNext) {
        let posts = await retryOnError(
          () => pages.next(),
          () => {
            increaseKey($stats, 'errors')
          }
        )
        if (posts === 'error') {
          increaseKey($stats, 'missedFeeds')
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
                increaseKey($stats, 'foundFast')
              } else {
                increaseKey($stats, 'foundSlow')
              }
            }
          }
        }
      }
      await end()
    }
  })
  $isRefreshing.set(false)
}

export function stopRefreshing(): void {
  if (!$isRefreshing.get()) return
  $isRefreshing.set(false)
  queue.stop()
  task.destroy()
}
