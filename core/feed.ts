import {
  changeSyncMapById,
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type Filter,
  type FilterStore,
  loadValue,
  type SyncMapStore,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'
import { atom, onMount } from 'nanostores'

import { getClient } from './client.ts'
import { createDownloadTask, type TextResponse } from './lib/download.ts'
import type { OptionalId } from './lib/stores.ts'
import { type FeedLoader, type LoaderName, loaders } from './loader/index.ts'
import { deletePost, getPosts, recalcPostsReading } from './post.ts'
import type { PostsList } from './posts-list.ts'
import type { UsefulReaderName } from './readers/common.ts'

export type FeedValue = {
  categoryId: string
  fastReader?: UsefulReaderName
  id: string
  lastOriginId?: string
  lastPublishedAt?: number
  loader: LoaderName
  reading: 'fast' | 'slow'
  refreshedAt?: number
  slowReader?: UsefulReaderName
  title: string
  url: string
}

export const Feed = syncMapTemplate<FeedValue>('feeds', {
  offline: true,
  remote: false
})

export function getFeed(feedId: string): SyncMapStore<FeedValue> {
  return Feed(feedId, getClient())
}

export function getFeeds(
  filter: Filter<FeedValue> = {}
): FilterStore<FeedValue> {
  return createFilter(getClient(), Feed, filter)
}

export async function addFeed(fields: OptionalId<FeedValue>): Promise<string> {
  let id = fields.id ?? nanoid()
  await createSyncMap(getClient(), Feed, { id, ...fields })
  return id
}

export async function deleteFeed(feedId: string): Promise<void> {
  let feed = Feed.cache[feedId]
  if (feed) feed.deleted = true
  let posts = await loadValue(getPosts({ feedId }))
  await Promise.all(posts.list.map(post => deletePost(post.id)))
  return deleteSyncMapById(getClient(), Feed, feedId)
}

export async function changeFeed(
  feedId: string,
  changes: Partial<FeedValue>
): Promise<void> {
  await changeSyncMapById(getClient(), Feed, feedId, changes)
  await recalcPostsReading(feedId)
}

/**
 * Subscribes to a feed which is currently being previewed.
 */
export async function addCandidate(
  candidate: FeedLoader,
  fields: Partial<FeedValue> = {},
  task = createDownloadTask(),
  response?: TextResponse
): Promise<string> {
  let posts = candidate.loader.getPosts(task, candidate.url, response)
  if (posts.get().isLoading) await posts.loading
  let lastPost = posts.get().list[0]

  return await addFeed({
    categoryId: 'general',
    lastOriginId: lastPost?.originId,
    lastPublishedAt: lastPost?.publishedAt ?? Math.round(Date.now() / 1000),
    loader: candidate.name,
    reading: 'slow',
    title: candidate.title,
    url: candidate.url,
    ...fields
  })
}

export function getFeedLatestPosts(
  feed: FeedValue,
  task = createDownloadTask()
): PostsList {
  if (feed.refreshedAt) {
    let originalTask = task
    task = {
      ...task,
      request(url, opts = {}) {
        let headers = new Headers(opts.headers)
        headers.set(
          'If-Modified-Since',
          new Date(feed.refreshedAt! * 1000).toUTCString()
        )
        return originalTask.request(url, {
          ...opts,
          headers
        })
      }
    }
  }

  return loaders[feed.loader].getPosts(task, feed.url)
}

let testFeedId = 0

export function testFeed(feed: Partial<FeedValue> = {}): FeedValue {
  testFeedId += 1
  return {
    categoryId: 'general',
    id: `feed-${testFeedId}`,
    lastOriginId: undefined,
    lastPublishedAt: undefined,
    loader: 'rss',
    reading: 'fast',
    title: `Test ${testFeedId}`,
    url: `http://example.com/${testFeedId}`,
    ...feed
  }
}

export const BROKEN_FEED: FeedValue = {
  categoryId: 'general',
  id: 'missed',
  lastOriginId: undefined,
  lastPublishedAt: undefined,
  loader: 'atom',
  reading: 'slow',
  title: 'Missed',
  url: ''
}

export const needWelcome = atom<boolean | undefined>()
onMount(needWelcome, () => {
  return getFeeds().subscribe(feeds => {
    needWelcome.set(feeds.isLoading ? undefined : feeds.isEmpty)
  })
})
