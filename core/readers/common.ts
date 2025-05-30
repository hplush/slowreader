import { loadValue } from '@logux/client'
import type { ReadableAtom, WritableAtom } from 'nanostores'

import { getFeeds } from '../feed.ts'
import { getPosts, type PostValue } from '../post.ts'
import type { Routes } from '../router.ts'

export interface BaseReader<Name extends ReaderName = ReaderName> {
  exit(): void
  list: ReadableAtom<PostValue[]>
  loading: ReadableAtom<boolean>
  name: Name
}

interface Extra {
  exit: () => void
  list: ReadableAtom<PostValue[]>
  loading: ReadableAtom<boolean>
}

export type PostFilter = { reading: 'fast' | 'slow' } & (
  | { categoryId: string }
  | { feedId: string }
)

type FeedParams = Routes['fast'] | Routes['slow']
type FeedStores = {
  [K in keyof FeedParams]-?: WritableAtom<FeedParams[K]>
}

export type ReaderName = 'feed' | 'list'

export interface ReaderCreator<
  Name extends ReaderName = ReaderName,
  Rest extends Extra = Extra
> {
  (filter: PostFilter, params: FeedStores): BaseReader<Name> & Rest
}

export function createReader<Name extends ReaderName, Rest extends Extra>(
  name: Name,
  builder: (filter: PostFilter, params: FeedStores) => Rest
): ReaderCreator<Name, Rest> {
  return (filter, params) => {
    let reader = builder(filter, params)
    return {
      ...reader,
      name
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
