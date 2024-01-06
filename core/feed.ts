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

import { client, getClient } from './client.js'
import { createDownloadTask } from './download.js'
import { type LoaderName, loaders } from './loader/index.js'
import { deletePost, getPosts } from './post.js'
import type { PostsPage } from './posts-page.js'
import { type OptionalId, readonlyExport } from './utils/stores.js'

export type FeedValue = {
  categoryId?: string
  id: string
  lastOriginId?: string
  lastPublishedAt?: number
  loader: LoaderName
  reading: 'fast' | 'slow'
  title: string
  url: string
}

export const Feed = syncMapTemplate<FeedValue>('feeds', {
  offline: true,
  remote: false
})

let $hasFeeds = atom<boolean | undefined>(false)
export const hasFeeds = readonlyExport($hasFeeds)

onMount($hasFeeds, () => {
  let unbindFeeds: (() => void) | undefined
  let unbindClient = client.subscribe(enabled => {
    unbindFeeds?.()
    unbindFeeds = undefined

    if (enabled) {
      unbindFeeds = getFeeds().subscribe(feeds => {
        if (feeds.isLoading) {
          $hasFeeds.set(undefined)
        } else {
          $hasFeeds.set(!feeds.isEmpty)
        }
      })
    }
  })

  return () => {
    unbindClient()
    unbindFeeds?.()
  }
})

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

export function getFeed(feedId: string): SyncMapStore<FeedValue> {
  return Feed(feedId, getClient())
}

export async function changeFeed(
  feedId: string,
  changes: Partial<FeedValue>
): Promise<void> {
  return changeSyncMapById(getClient(), Feed, feedId, changes)
}

export function getFeedLatestPosts(
  feed: FeedValue,
  task = createDownloadTask()
): PostsPage {
  return loaders[feed.loader].getPosts(task, feed.url)
}

let testFeedId = 0

export function testFeed(feed: Partial<FeedValue> = {}): FeedValue {
  testFeedId += 1
  return {
    categoryId: undefined,
    id: `test-${testFeedId}`,
    lastOriginId: undefined,
    lastPublishedAt: undefined,
    loader: 'rss',
    reading: 'fast',
    title: `Test ${testFeedId}`,
    url: `http://example.com/${testFeedId}`,
    ...feed
  }
}
