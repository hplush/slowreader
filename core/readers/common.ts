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

/**
 * Posts to be shown in the reader. Read posts are deleted on opening
 * the page, so the reader always starts from unread ones.
 */
export function loadPosts(filter: PostFilter): Promise<PostValue[]> {
  if (filter.categoryId) {
    return select<PostValue>`
      SELECT "posts".* FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
        AND "feeds"."categoryId" = ${filter.categoryId}
      ORDER BY "posts"."publishedAt" DESC
    `
  } else {
    return select<PostValue>`
      SELECT * FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 0
        AND "feedId" = ${filter.feedId ?? null}
      ORDER BY "publishedAt" DESC
    `
  }
}

/**
 * Only IDs, since read posts are loaded to be deleted.
 */
export function loadReadPostIds(filter: PostFilter): Promise<string[]> {
  let rows: Promise<{ id: string }[]>
  if (filter.categoryId) {
    rows = select`
      SELECT "posts"."id" FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 1
        AND "feeds"."categoryId" = ${filter.categoryId}
    `
  } else if (filter.feedId) {
    rows = select`
      SELECT "id" FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 1
        AND "feedId" = ${filter.feedId}
    `
  } else {
    rows = select`
      SELECT "id" FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 1
    `
  }
  return rows.then(list => list.map(row => row.id))
}
