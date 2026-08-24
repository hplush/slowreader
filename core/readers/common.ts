import type { SqlStore } from '@nanostores/sql'
import type { ReadableAtom, WritableAtom } from 'nanostores'

import type { PostValue, ReaderPost } from '../post.ts'
import type { Routes } from '../router.ts'
import { getTables, select } from '../schema.ts'

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

/**
 * Position of the post in the reading order.
 *
 * Feeds often publish posts with the same `publishedAt`, so the cursor takes
 * `id` as the second key to be unique. Without it a page could hide the posts
 * of the same second or show them twice.
 */
export type PostCursor = {
  id: string
  publishedAt: number
}

/**
 * The cursor above every post, since no post has an empty `id`.
 *
 * `feedReader` pins the first page to the moment of opening the reader,
 * so posts, which came during the reading, will not move the pages.
 */
export function topCursor(publishedAt = Number.MAX_SAFE_INTEGER): PostCursor {
  return { id: '', publishedAt }
}

export function parseCursor(from: string | undefined): PostCursor | undefined {
  if (!from?.includes(':')) return undefined
  return {
    id: from.slice(from.indexOf(':') + 1),
    publishedAt: parseInt(from)
  }
}

export function stringifyCursor(cursor: PostCursor): string {
  return `${cursor.publishedAt}:${cursor.id}`
}

/**
 * A page of unread posts older than the cursor.
 *
 * Pages are taken by the cursor and not by `OFFSET`, since another tab or
 * another device can read or delete posts at any moment.
 */
export function loadPostsPage(
  filter: PostFilter,
  cursor: PostCursor,
  limit: number
): Promise<ReaderPost[]> {
  if (filter.categoryId) {
    return select<ReaderPost>`
      SELECT "posts"."id", "posts"."feedId", "posts"."media",
        "posts"."originId", "posts"."publishedAt", "posts"."read",
        "posts"."title", "posts"."url",
        NULLIF("posts"."intro", '') AS "intro",
        CASE WHEN COALESCE("posts"."intro", '') = ''
          THEN "posts"."full" END AS "full",
        COALESCE(NULLIF("posts"."intro", '') <> "posts"."full", 0) AS "more",
        "feeds"."title" AS "authorTitle", "feeds"."url" AS "authorUrl"
      FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
        AND "feeds"."categoryId" = ${filter.categoryId}
        AND ("posts"."publishedAt", "posts"."id")
          < (${cursor.publishedAt}, ${cursor.id})
      ORDER BY "posts"."publishedAt" DESC, "posts"."id" DESC
      LIMIT ${limit}
    `
  } else {
    return select<ReaderPost>`
      SELECT "id", "feedId", "media", "originId", "publishedAt",
        "read", "title", "url", NULLIF("intro", '') AS "intro",
        CASE WHEN COALESCE("intro", '') = '' THEN "full" END AS "full",
        COALESCE(NULLIF("intro", '') <> "full", 0) AS "more"
      FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 0
        AND "feedId" = ${filter.feedId ?? null}
        AND ("publishedAt", "id") < (${cursor.publishedAt}, ${cursor.id})
      ORDER BY "publishedAt" DESC, "id" DESC
      LIMIT ${limit}
    `
  }
}

/**
 * Cursors of unread posts newer than the cursor, from the oldest one.
 *
 * `feedReader` uses it to find the cursor of the previous page. An empty
 * result means that there is nothing to read above, so the page is the first.
 */
export function loadPostsAbove(
  filter: PostFilter,
  cursor: PostCursor,
  limit: number
): Promise<PostCursor[]> {
  if (filter.categoryId) {
    return select<PostCursor>`
      SELECT "posts"."publishedAt", "posts"."id" FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
        AND "feeds"."categoryId" = ${filter.categoryId}
        AND ("posts"."publishedAt", "posts"."id")
          >= (${cursor.publishedAt}, ${cursor.id})
      ORDER BY "posts"."publishedAt" ASC, "posts"."id" ASC
      LIMIT ${limit}
    `
  } else {
    return select<PostCursor>`
      SELECT "publishedAt", "id" FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 0
        AND "feedId" = ${filter.feedId ?? null}
        AND ("publishedAt", "id") >= (${cursor.publishedAt}, ${cursor.id})
      ORDER BY "publishedAt" ASC, "id" ASC
      LIMIT ${limit}
    `
  }
}

/**
 * The cursor before the first post of every page.
 *
 * `listReader` shows page numbers, so it needs a stable cursor for every page.
 * Cursors are taken once on opening the reader: reading a page must not
 * renumber the pages under the user.
 *
 * `LAG()` takes the post above the page, since the cursor is strict `<`.
 * The first page has no post above and gets `NULL` and `topCursor()`.
 */
export function loadPageCursors(
  filter: PostFilter,
  perPage: number
): Promise<PostCursor[]> {
  let rows: Promise<{ id: null | string; publishedAt: null | number }[]>
  if (filter.categoryId) {
    rows = select`
      SELECT "publishedAt", "id" FROM (
        SELECT LAG("posts"."publishedAt") OVER "reading" AS "publishedAt",
          LAG("posts"."id") OVER "reading" AS "id",
          ROW_NUMBER() OVER "reading" AS "row"
        FROM "posts"
        JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
        WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
          AND "feeds"."categoryId" = ${filter.categoryId}
        WINDOW "reading" AS (
          ORDER BY "posts"."publishedAt" DESC, "posts"."id" DESC
        )
      ) WHERE ("row" - 1) % ${perPage} = 0
      ORDER BY "row" ASC
    `
  } else {
    rows = select`
      SELECT "publishedAt", "id" FROM (
        SELECT LAG("publishedAt") OVER "reading" AS "publishedAt",
          LAG("id") OVER "reading" AS "id",
          ROW_NUMBER() OVER "reading" AS "row"
        FROM "posts"
        WHERE "reading" = ${filter.reading} AND "read" = 0
          AND "feedId" = ${filter.feedId ?? null}
        WINDOW "reading" AS (ORDER BY "publishedAt" DESC, "id" DESC)
      ) WHERE ("row" - 1) % ${perPage} = 0
      ORDER BY "row" ASC
    `
  }
  return rows.then(list =>
    list.map(row => {
      if (row.id === null) return topCursor()
      return { id: row.id, publishedAt: row.publishedAt! }
    })
  )
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

export function trackReadPosts(
  filter: PostFilter,
  list: WritableAtom<ReaderPost[]>
): () => void {
  // The table’s store is used instead of a query for IDs, since a query
  // for the indexed columns only will read the index and not the table,
  // and the store will not know which table to watch
  let $read: SqlStore<PostValue[]>
  if (filter.categoryId) {
    $read = getTables().posts.select`
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 1
        AND "feeds"."categoryId" = ${filter.categoryId}
    `
  } else {
    $read = getTables().posts.select`
      WHERE "reading" = ${filter.reading} AND "read" = 1
        AND "feedId" = ${filter.feedId!}
    `
  }
  return $read.subscribe(rows => {
    if (rows.isLoading) return
    let read = new Set(rows.value.map(row => row.id))
    let prev = list.get()
    let next = prev.map(post => {
      let value = read.has(post.id) ? 1 : 0
      return post.read === value ? post : { ...post, read: value }
    })
    if (next.some((post, index) => post !== prev[index])) list.set(next)
  })
}
