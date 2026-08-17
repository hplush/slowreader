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
 * Feed’s title and URL for the post’s author line. Readers take them from
 * the same query as posts, so a category page does not load all its feeds.
 */
export type PostAuthor = { title: string; url: string }

export type ReaderPost = {
  authorTitle?: string
  authorUrl?: string
} & PostValue

/**
 * A page of unread posts older than the cursor.
 *
 * Pages are taken by the cursor and not by `OFFSET`, since another tab or
 * another device can read or delete posts at any moment.
 *
 * `feedReader` continues after the last shown post, so it needs posts strictly
 * older than the cursor. `listReader` jumps to the first post of the page,
 * so it needs the cursor’s post too.
 */
export function loadPostsPage(
  filter: PostFilter,
  cursor: number,
  limit: number,
  withCursor = false
): Promise<ReaderPost[]> {
  // `publishedAt` is an integer, so the cursor’s post is included by `+ 1`
  let before = withCursor ? cursor + 1 : cursor
  if (filter.categoryId) {
    return select<ReaderPost>`
      SELECT "posts".*,
        "feeds"."title" AS "authorTitle", "feeds"."url" AS "authorUrl"
      FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
        AND "feeds"."categoryId" = ${filter.categoryId}
        AND "posts"."publishedAt" < ${before}
      ORDER BY "posts"."publishedAt" DESC
      LIMIT ${limit}
    `
  } else {
    return select<ReaderPost>`
      SELECT * FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 0
        AND "feedId" = ${filter.feedId ?? null}
        AND "publishedAt" < ${before}
      ORDER BY "publishedAt" DESC
      LIMIT ${limit}
    `
  }
}

/**
 * `publishedAt` of unread posts newer than the cursor, from the oldest one.
 *
 * `feedReader` uses it to find the cursor of the previous page. An empty
 * result means that there is nothing to read above, so the page is the first.
 */
export function loadPostsAbove(
  filter: PostFilter,
  cursor: number,
  limit: number
): Promise<number[]> {
  let rows: Promise<{ publishedAt: number }[]>
  if (filter.categoryId) {
    rows = select`
      SELECT "posts"."publishedAt" FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
        AND "feeds"."categoryId" = ${filter.categoryId}
        AND "posts"."publishedAt" >= ${cursor}
      ORDER BY "posts"."publishedAt" ASC
      LIMIT ${limit}
    `
  } else {
    rows = select`
      SELECT "publishedAt" FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 0
        AND "feedId" = ${filter.feedId ?? null}
        AND "publishedAt" >= ${cursor}
      ORDER BY "publishedAt" ASC
      LIMIT ${limit}
    `
  }
  return rows.then(list => list.map(row => row.publishedAt))
}

/**
 * `publishedAt` of the first post of every page.
 *
 * `listReader` shows page numbers, so it needs a stable cursor for every page.
 * Cursors are taken once on opening the reader: reading a page must not
 * renumber the pages under the user.
 */
export function loadPageCursors(
  filter: PostFilter,
  perPage: number
): Promise<number[]> {
  let rows: Promise<{ publishedAt: number }[]>
  if (filter.categoryId) {
    rows = select`
      SELECT "publishedAt" FROM (
        SELECT "posts"."publishedAt" AS "publishedAt",
          ROW_NUMBER() OVER (ORDER BY "posts"."publishedAt" DESC) AS "row"
        FROM "posts"
        JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
        WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
          AND "feeds"."categoryId" = ${filter.categoryId}
      ) WHERE ("row" - 1) % ${perPage} = 0
    `
  } else {
    rows = select`
      SELECT "publishedAt" FROM (
        SELECT "publishedAt",
          ROW_NUMBER() OVER (ORDER BY "publishedAt" DESC) AS "row"
        FROM "posts"
        WHERE "reading" = ${filter.reading} AND "read" = 0
          AND "feedId" = ${filter.feedId ?? null}
      ) WHERE ("row" - 1) % ${perPage} = 0
    `
  }
  return rows.then(list => list.map(row => row.publishedAt))
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
