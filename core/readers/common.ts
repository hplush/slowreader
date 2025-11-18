import { loadValue } from '@logux/client'
import type { ReadableAtom, WritableAtom } from 'nanostores'

import { getFeeds } from '../feed.ts'
import { getPosts, type PostValue } from '../post.ts'
import type { Routes } from '../router.ts'

export interface BaseReader<Name extends ReaderName = ReaderName> {
  exit(): void
  loading: ReadableAtom<boolean>
  name: Name
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
    params: FeedStores
  ): (BaseReader<Name> & Rest) | undefined
}

export function createReader<Name extends ReaderName, Rest extends Extra>(
  name: Name,
  builder: (filter: PostFilter, params: FeedStores) => Rest | undefined
): ReaderCreator<Name, Rest> {
  return (filter, params) => {
    let reader = builder(filter, params)
    if (reader) {
      return {
        ...reader,
        name
      }
    }
  }
}

export async function loadPosts(filter: PostFilter): Promise<PostValue[]> {
  let posts: PostValue[]
  if ('categoryId' in filter) {
    let [allPosts, feeds] = await Promise.all([
      loadValue(getPosts({ reading: filter.reading })),
      loadValue(getFeeds({ categoryId: filter.categoryId }))
    ])
    posts = allPosts.list.filter(i => feeds.stores.has(i.feedId))
  } else {
    posts = (
      await loadValue(
        getPosts({ feedId: filter.feedId, reading: filter.reading })
      )
    ).list
  }
  return posts.sort((a, b) => b.publishedAt - a.publishedAt)
}
