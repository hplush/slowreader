import type { ReadableAtom, WritableAtom } from 'nanostores'

import type { PostValue } from '../post.ts'
import type { Routes } from '../router.ts'
import { select } from '../schema.ts'

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

function selectPosts(filter: PostFilter, read: 0 | 1): Promise<PostValue[]> {
  if (filter.categoryId) {
    return select<PostValue>`
      SELECT "posts".* FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading}
        AND "posts"."read" = ${read}
        AND "feeds"."categoryId" = ${filter.categoryId}
      ORDER BY "posts"."publishedAt" DESC
    `
  } else if (filter.feedId) {
    return select<PostValue>`
      SELECT * FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = ${read}
        AND "feedId" = ${filter.feedId}
      ORDER BY "publishedAt" DESC
    `
  } else {
    return select<PostValue>`
      SELECT * FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = ${read}
      ORDER BY "publishedAt" DESC
    `
  }
}

/**
 * Posts to be shown in the reader. Read posts are deleted on opening
 * the page, so the reader always starts from unread ones.
 */
export function loadPosts(filter: PostFilter): Promise<PostValue[]> {
  return selectPosts(filter, 0)
}

export function loadReadPosts(filter: PostFilter): Promise<PostValue[]> {
  return selectPosts(filter, 1)
}
