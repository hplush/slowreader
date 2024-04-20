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
import { type OptionalId, readonlyExport } from './lib/stores.js'
import { type LoaderName, loaders } from './loader/index.js'
import { changePost, deletePost, loadPosts } from './post.js'
import type { PostsPage } from './posts-page.js'

export type FeedValue = {
  categoryId: string
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

export async function loadFeeds(
  filter: Filter<FeedValue> = {}
): Promise<FeedValue[]> {
  let value = await loadValue(getFeeds(filter))
  return value.list
}

export async function addFeed(fields: OptionalId<FeedValue>): Promise<string> {
  let id = fields.id ?? nanoid()
  await createSyncMap(getClient(), Feed, { id, ...fields })
  return id
}

export async function deleteFeed(feedId: string): Promise<void> {
  let feed = Feed.cache[feedId]
  if (feed) feed.deleted = true
  let posts = await loadPosts({ feedId })
  await Promise.all(posts.map(post => deletePost(post.id)))
  return deleteSyncMapById(getClient(), Feed, feedId)
}

export function getFeed(feedId: string): SyncMapStore<FeedValue> {
  return Feed(feedId, getClient())
}

export async function loadFeed(feedId: string): Promise<FeedValue | undefined> {
  return loadValue(Feed(feedId, getClient()))
}

export async function changeFeed(
  feedId: string,
  changes: Partial<FeedValue>
): Promise<void> {
  if (changes.reading) {
    let posts = await loadPosts({ feedId })
    await Promise.all(
      posts.map(post =>
        changePost(post.id, {
          reading: changes.reading
        })
      )
    )
  }
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
  reading: 'fast',
  title: 'Missed',
  url: ''
}
