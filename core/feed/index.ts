import {
  createFilter,
  createSyncMap,
  type Filter,
  type FilterStore,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'
import { computed, type ReadableAtom } from 'nanostores'

import { getClient } from '../client/index.js'
import type { LoaderName } from '../loader/index.js'

export type FeedValue = {
  loader: LoaderName
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

export function hasFeedStore(url: string): ReadableAtom<boolean | undefined> {
  let $feedsWithUrl = feedsStore({ url })
  return computed($feedsWithUrl, feeds => {
    if (feeds.isLoading) {
      return undefined
    } else {
      return !feeds.isEmpty
    }
  })
}

export async function addFeed(fields: FeedValue): Promise<void> {
  return createSyncMap(getClient(), Feed, {
    id: nanoid(),
    ...fields
  })
}
