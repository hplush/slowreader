import {
  ensureLoadedStore,
  type LoadedSyncMap,
  loadValue,
  type SyncMapStore
} from '@logux/client'
import type { ReadableAtom, WritableAtom } from 'nanostores'

import { getFeeds } from '../feed.ts'
import { getPosts, type PostValue } from '../post.ts'
import type { Routes } from '../router.ts'

export interface BaseReader<Name extends ReaderName = ReaderName> {
  exit(): void
  loading: ReadableAtom<boolean>
  name: Name
}

export interface ReaderHelpers {
  renderEmpty(): void
}

interface Extra {
  exit: () => void
  loading: ReadableAtom<boolean>
}

export type PostFilter = {
  categoryId?: string
  feedId?: string
  reading: 'fast' | 'slow'
}

type FeedParams = Routes['fast'] | Routes['slow']
type FeedStores = {
  [K in keyof FeedParams]-?: WritableAtom<FeedParams[K]>
}

export type ReaderName = 'empty' | 'feed' | 'list' | 'welcome'

export type UsefulReaderName = Exclude<ReaderName, 'empty' | 'welcome'>

export interface ReaderCreator<
  Name extends ReaderName = ReaderName,
  Rest extends Extra = Extra
> {
  (
    filter: PostFilter,
    params: FeedStores,
    helpers: ReaderHelpers
  ): (BaseReader<Name> & Rest) | undefined
}

export function createReader<Name extends ReaderName, Rest extends Extra>(
  name: Name,
  builder: (
    filter: PostFilter,
    params: FeedStores,
    helpers: ReaderHelpers
  ) => Rest | undefined
): ReaderCreator<Name, Rest> {
  return (filter, params, helpers) => {
    let reader = builder(filter, params, helpers)
    if (reader) {
      return {
        ...reader,
        name
      }
    }
  }
}

export async function loadPosts(
  filter: PostFilter
): Promise<LoadedSyncMap<SyncMapStore<PostValue>>[]> {
  let posts: PostValue[]
  let stores: Map<string, SyncMapStore<PostValue>>
  if ('categoryId' in filter) {
    let [allPosts, feeds] = await Promise.all([
      loadValue(getPosts({ reading: filter.reading })),
      loadValue(getFeeds({ categoryId: filter.categoryId }))
    ])
    stores = allPosts.stores
    posts = allPosts.list.filter(i => {
      return feeds.stores.has(i.feedId) && !allPosts.stores.get(i.id)?.deleted
    })
  } else {
    let value = await loadValue(
      getPosts({ feedId: filter.feedId, reading: filter.reading })
    )
    stores = value.stores
    posts = value.list.filter(i => !value.stores.get(i.id)?.deleted)
  }
  return posts
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .map(i => stores.get(i.id))
    .filter(i => !!i)
    .map(i => ensureLoadedStore(i))
}
