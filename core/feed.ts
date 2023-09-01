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

import { getClient } from './client.js'
import type { LoaderName } from './loader/index.js'

export type FeedValue = {
  loader: LoaderName
  reading: 'fast' | 'slow'
  title: string
  url: string
}

export const Feed = syncMapTemplate<FeedValue>('feeds', {
  offline: true,
  remote: false
})

export function feedsStore(
  filter: Filter<FeedValue> = {}
): FilterStore<FeedValue> {
  return createFilter(getClient(), Feed, filter)
}

export async function addFeed(fields: FeedValue): Promise<string> {
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
