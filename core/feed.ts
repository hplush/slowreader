import {
  changeSyncMapById,
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type Filter,
  type FilterStore,
  type SyncMapStore,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'
import { atom, onMount } from 'nanostores'

import { client, getClient } from './client.js'
import { createDownloadTask } from './download.js'
import { type LoaderName, loaders } from './loader/index.js'
import type { PostsPage } from './posts-page.js'
import { readonlyExport } from './utils/stores.js'

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

export function getFeeds(
  filter: Filter<FeedValue> = {}
): FilterStore<FeedValue> {
  return createFilter(getClient(), Feed, filter)
}

export async function addFeed(fields: Omit<FeedValue, 'id'>): Promise<string> {
  let id = nanoid()
  await createSyncMap(getClient(), Feed, { id, ...fields })
  return id
}

export async function deleteFeed(feedId: string): Promise<void> {
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

let $hasFeeds = atom<boolean | undefined>(false)
onMount($hasFeeds, () => {
  let unbindFeeds: (() => void) | undefined
  let unbindClient = client.subscribe(enabled => {
    if (enabled) {
      unbindFeeds = getFeeds().subscribe(feeds => {
        if (feeds.isLoading) {
          $hasFeeds.set(undefined)
        } else {
          $hasFeeds.set(!feeds.isEmpty)
        }
      })
    } else {
      unbindFeeds?.()
      unbindFeeds = undefined
    }
  })

  return () => {
    unbindClient()
    unbindFeeds?.()
  }
})

export const hasFeeds = readonlyExport($hasFeeds)
