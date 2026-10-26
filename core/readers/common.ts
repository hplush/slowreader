import type { SqlStore } from '@nanostores/sql'
import type { ReadableAtom, WritableAtom } from 'nanostores'

import { nextValue } from '../lib/stores.ts'
import { slowMenu, unreadFastMenu } from '../menu.ts'
import {
  addMediaSizes,
  changeRead,
  hasUnreadPosts,
  type PostValue,
  type PreviewPost,
  type ReaderPost,
  type ReaderPostWith
} from '../post.ts'
import { navigate, router, type Routes } from '../router.ts'
import { getCrdt, getTables } from '../schema.ts'

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
  [K in keyof FeedParams]-?: ReadableAtom<FeedParams[K]>
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

/**
 * Feed’s title, URL, and icon for the post’s author line. Readers take them
 * from the same query as posts, so a category page does not load all its feeds.
 */
export type FeedAuthor = {
  avatar: null | string
  feedId: string
  title: string
  url: string
}

/**
 * Feed previews and account’s posts have no feed and show their own `author`.
 */
export function getFeedAuthor(
  post: PreviewPost | ReaderPost,
  authors: ReadonlyMap<string, FeedAuthor> | undefined
): FeedAuthor | undefined {
  if ('feedId' in post && post.feedId) return authors?.get(post.feedId)
  return undefined
}

function menuHasUnread(filter: PostFilter): boolean {
  if (filter.reading === 'fast') {
    return unreadFastMenu.get().some(i => i.id === filter.categoryId)
  } else {
    return slowMenu
      .get()
      .some(([, feeds]) => feeds.some(([feed]) => feed.id === filter.feedId))
  }
}

async function waitDisappearFromMenu(filter: PostFilter): Promise<void> {
  let noNeedWait = await hasUnreadPosts(filter.reading, filter)
  if (noNeedWait) return
  let menu = filter.reading === 'fast' ? unreadFastMenu : slowMenu
  while (menuHasUnread(filter)) await nextValue(menu)
}

function stillOpened(filter: PostFilter): boolean {
  let current = router.get()
  if (current.route !== filter.reading) return false
  let params: { category?: string; feed?: string } = current.params
  return params.category === filter.categoryId && params.feed === filter.feedId
}

/**
 * Mark the posts as read and move to the next page of the reader
 * or, without it, give the reading back to the home page.
 */
export async function readAndMove(
  filter: PostFilter,
  params: FeedStores,
  posts: ReaderPost[],
  nextFrom: string | undefined,
  readingPage: WritableAtom<boolean>
): Promise<void> {
  readingPage.set(true)
  await changeRead(
    posts.filter(post => !post.read).map(post => post.id),
    true
  )
  let route = filter.reading
  if (!nextFrom) {
    await waitDisappearFromMenu(filter)
    if (filter.reading === 'fast' && !(await hasUnreadPosts('fast'))) {
      route = 'slow'
    }
  }
  // The user could leave the page during the write
  if (stillOpened(filter)) {
    if (nextFrom) {
      navigate(current =>
        current.route === 'fast' || current.route === 'slow'
          ? {
              ...current,
              params: { ...current.params, from: nextFrom },
              popups: []
            }
          : current
      )
    } else {
      navigate({ params: {}, popups: [], route }, true)
    }
  }
  readingPage.set(false)
}

/**
 * Position of the post in the reading order.
 *
 * Feeds often publish posts with the same `sortedAt`, so the cursor takes
 * `id` as the second key to be unique. Without it a page could hide the posts
 * of the same second or show them twice.
 */
export type PostCursor = {
  id: string
  sortedAt: number
}

/**
 * The cursor above every post, since no post has an empty `id`.
 *
 * `feedReader` pins the first page to the moment of opening the reader,
 * so posts, which came during the reading, will not move the pages.
 */
export function topCursor(sortedAt = Number.MAX_SAFE_INTEGER): PostCursor {
  return { id: '', sortedAt }
}

export function parseCursor(from: string | undefined): PostCursor | undefined {
  if (!from?.includes(':')) return undefined
  return {
    id: from.slice(from.indexOf(':') + 1),
    sortedAt: parseInt(from)
  }
}

export function stringifyCursor(cursor: PostCursor): string {
  return `${cursor.sortedAt}:${cursor.id}`
}

type ReaderPostRow = Pick<PostValue, 'mediaSizes'> &
  ReaderPostWith<PostValue['media']>

function toReaderPost(row: ReaderPostRow): ReaderPost {
  let { mediaSizes, ...post } = getTables().posts.parseRow(row)
  return { ...post, media: addMediaSizes(post.media, mediaSizes) }
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
  let rows: Promise<ReaderPostRow[]>
  if (filter.categoryId) {
    rows = getCrdt().select<ReaderPostRow>`
      SELECT "posts"."id", "posts"."feedId", "posts"."media",
        "posts"."mediaSizes", "posts"."originId", "posts"."publishedAt",
        "posts"."sortedAt", "posts"."lang", "posts"."poll",
        "posts"."read", "posts"."title", "posts"."url", "posts"."author",
        "posts"."preview", "posts"."quoted", "posts"."replied",
        "posts"."repostedBy", "posts"."threadId", "posts"."unsupported",
        "posts"."warning", (SELECT COUNT(*) FROM "posts" AS "thread"
          WHERE "thread"."threadId" = "posts"."threadId"
            AND "thread"."feedId" IS "posts"."feedId"
            AND "thread"."accountId" IS "posts"."accountId") AS "threadSize",
        NULLIF("posts"."intro", '') AS "intro",
        CASE WHEN COALESCE("posts"."intro", '') = ''
          THEN "posts"."full" END AS "full",
        COALESCE(NULLIF("posts"."intro", '') <> "posts"."full", 0) AS "more",
        "feeds"."title" AS "authorTitle", "feeds"."url" AS "authorUrl",
        "feeds"."avatar" AS "authorAvatar"
      FROM "posts"
      LEFT JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      LEFT JOIN "accounts" ON "accounts"."id" = "posts"."accountId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
        AND "posts"."merged" = 0
        AND COALESCE("feeds"."categoryId", "accounts"."categoryId")
          = ${filter.categoryId}
        AND ("posts"."sortedAt", "posts"."id")
          < (${cursor.sortedAt}, ${cursor.id})
      ORDER BY "posts"."sortedAt" DESC, "posts"."id" DESC
      LIMIT ${limit}
    `
  } else {
    rows = getCrdt().select<ReaderPostRow>`
      SELECT "id", "feedId", "media", "mediaSizes", "originId",
        "publishedAt", "sortedAt", "read", "title", "url", "author", "preview",
        "quoted", "lang", "poll",
        "replied", "repostedBy", "threadId", "unsupported", "warning",
        (SELECT COUNT(*) FROM "posts" AS "thread"
          WHERE "thread"."feedId" = "posts"."feedId"
            AND "thread"."threadId" = "posts"."threadId") AS "threadSize",
        NULLIF("intro", '') AS "intro",
        CASE WHEN COALESCE("intro", '') = '' THEN "full" END AS "full",
        COALESCE(NULLIF("intro", '') <> "full", 0) AS "more"
      FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 0 AND "merged" = 0
        AND "feedId" = ${filter.feedId ?? null}
        AND ("sortedAt", "id") < (${cursor.sortedAt}, ${cursor.id})
      ORDER BY "sortedAt" DESC, "id" DESC
      LIMIT ${limit}
    `
  }
  return rows.then(list => list.map(toReaderPost))
}

/**
 * All posts of the page between its cursor and the cursor of the next page.
 *
 * `listReader` takes the pages on opening, so the read page keeps its posts
 * and only shows them in the read style, like the posts read on the open page.
 */
export function loadPostsRange(
  filter: PostFilter,
  cursor: PostCursor,
  until: PostCursor | undefined
): Promise<ReaderPost[]> {
  let rows: Promise<ReaderPostRow[]>
  // No post is below the zero time with the empty ID
  let lowest = until ?? { id: '', sortedAt: 0 }
  if (filter.categoryId) {
    rows = getCrdt().select<ReaderPostRow>`
      SELECT "posts"."id", "posts"."feedId", "posts"."media",
        "posts"."mediaSizes", "posts"."originId", "posts"."publishedAt",
        "posts"."sortedAt", "posts"."lang", "posts"."poll",
        "posts"."read", "posts"."title", "posts"."url", "posts"."author",
        "posts"."preview", "posts"."quoted", "posts"."replied",
        "posts"."repostedBy", "posts"."threadId", "posts"."unsupported",
        "posts"."warning", (SELECT COUNT(*) FROM "posts" AS "thread"
          WHERE "thread"."threadId" = "posts"."threadId"
            AND "thread"."feedId" IS "posts"."feedId"
            AND "thread"."accountId" IS "posts"."accountId") AS "threadSize",
        NULLIF("posts"."intro", '') AS "intro",
        CASE WHEN COALESCE("posts"."intro", '') = ''
          THEN "posts"."full" END AS "full",
        COALESCE(NULLIF("posts"."intro", '') <> "posts"."full", 0) AS "more",
        "feeds"."title" AS "authorTitle", "feeds"."url" AS "authorUrl",
        "feeds"."avatar" AS "authorAvatar"
      FROM "posts"
      LEFT JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      LEFT JOIN "accounts" ON "accounts"."id" = "posts"."accountId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."merged" = 0
        AND COALESCE("feeds"."categoryId", "accounts"."categoryId")
          = ${filter.categoryId}
        AND ("posts"."sortedAt", "posts"."id")
          < (${cursor.sortedAt}, ${cursor.id})
        AND ("posts"."sortedAt", "posts"."id")
          >= (${lowest.sortedAt}, ${lowest.id})
      ORDER BY "posts"."sortedAt" DESC, "posts"."id" DESC
    `
  } else {
    rows = getCrdt().select<ReaderPostRow>`
      SELECT "id", "feedId", "media", "mediaSizes", "originId",
        "publishedAt", "sortedAt", "read", "title", "url", "author", "preview",
        "quoted", "lang", "poll",
        "replied", "repostedBy", "threadId", "unsupported", "warning",
        (SELECT COUNT(*) FROM "posts" AS "thread"
          WHERE "thread"."feedId" = "posts"."feedId"
            AND "thread"."threadId" = "posts"."threadId") AS "threadSize",
        NULLIF("intro", '') AS "intro",
        CASE WHEN COALESCE("intro", '') = '' THEN "full" END AS "full",
        COALESCE(NULLIF("intro", '') <> "full", 0) AS "more"
      FROM "posts"
      WHERE "reading" = ${filter.reading} AND "merged" = 0
        AND "feedId" = ${filter.feedId ?? null}
        AND ("sortedAt", "id") < (${cursor.sortedAt}, ${cursor.id})
        AND ("sortedAt", "id") >= (${lowest.sortedAt}, ${lowest.id})
      ORDER BY "sortedAt" DESC, "id" DESC
    `
  }
  return rows.then(list => list.map(toReaderPost))
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
    return getCrdt().select<PostCursor>`
      SELECT "posts"."sortedAt", "posts"."id" FROM "posts"
      LEFT JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      LEFT JOIN "accounts" ON "accounts"."id" = "posts"."accountId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
        AND "posts"."merged" = 0
        AND COALESCE("feeds"."categoryId", "accounts"."categoryId")
          = ${filter.categoryId}
        AND ("posts"."sortedAt", "posts"."id")
          >= (${cursor.sortedAt}, ${cursor.id})
      ORDER BY "posts"."sortedAt" ASC, "posts"."id" ASC
      LIMIT ${limit}
    `
  } else {
    return getCrdt().select<PostCursor>`
      SELECT "sortedAt", "id" FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 0 AND "merged" = 0
        AND "feedId" = ${filter.feedId ?? null}
        AND ("sortedAt", "id") >= (${cursor.sortedAt}, ${cursor.id})
      ORDER BY "sortedAt" ASC, "id" ASC
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
  let rows: Promise<{ id: null | string; sortedAt: null | number }[]>
  if (filter.categoryId) {
    rows = getCrdt().select`
      SELECT "sortedAt", "id" FROM (
        SELECT LAG("posts"."sortedAt") OVER "reading" AS "sortedAt",
          LAG("posts"."id") OVER "reading" AS "id",
          ROW_NUMBER() OVER "reading" AS "row"
        FROM "posts"
        LEFT JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
        LEFT JOIN "accounts" ON "accounts"."id" = "posts"."accountId"
        WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 0
          AND "posts"."merged" = 0
          AND COALESCE("feeds"."categoryId", "accounts"."categoryId")
            = ${filter.categoryId}
        WINDOW "reading" AS (
          ORDER BY "posts"."sortedAt" DESC, "posts"."id" DESC
        )
      ) WHERE ("row" - 1) % ${perPage} = 0
      ORDER BY "row" ASC
    `
  } else {
    rows = getCrdt().select`
      SELECT "sortedAt", "id" FROM (
        SELECT LAG("sortedAt") OVER "reading" AS "sortedAt",
          LAG("id") OVER "reading" AS "id",
          ROW_NUMBER() OVER "reading" AS "row"
        FROM "posts"
        WHERE "reading" = ${filter.reading} AND "read" = 0 AND "merged" = 0
          AND "feedId" = ${filter.feedId ?? null}
        WINDOW "reading" AS (ORDER BY "sortedAt" DESC, "id" DESC)
      ) WHERE ("row" - 1) % ${perPage} = 0
      ORDER BY "row" ASC
    `
  }
  return rows.then(list =>
    list.map(row => {
      if (row.id === null) return topCursor()
      return { id: row.id, sortedAt: row.sortedAt! }
    })
  )
}

/**
 * Only IDs, since read posts are loaded to be deleted.
 */
export function loadReadPostIds(filter: PostFilter): Promise<string[]> {
  let rows: Promise<{ id: string }[]>
  if (filter.categoryId) {
    rows = getCrdt().select`
      SELECT "posts"."id" FROM "posts"
      LEFT JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      LEFT JOIN "accounts" ON "accounts"."id" = "posts"."accountId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 1
        AND COALESCE("feeds"."categoryId", "accounts"."categoryId")
          = ${filter.categoryId}
    `
  } else if (filter.feedId) {
    rows = getCrdt().select`
      SELECT "id" FROM "posts"
      WHERE "reading" = ${filter.reading} AND "read" = 1
        AND "feedId" = ${filter.feedId}
    `
  } else {
    rows = getCrdt().select`
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
      LEFT JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      LEFT JOIN "accounts" ON "accounts"."id" = "posts"."accountId"
      WHERE "posts"."reading" = ${filter.reading} AND "posts"."read" = 1
        AND COALESCE("feeds"."categoryId", "accounts"."categoryId")
          = ${filter.categoryId}
    `
  } else {
    $read = getTables().posts.select`
      WHERE "reading" = ${filter.reading} AND "read" = 1
        AND "feedId" = ${filter.feedId!}
    `
  }
  return $read.subscribe(rows => {
    if (rows.status === 'loading') return
    let read = new Set(rows.value.map(row => row.id))
    let prev = list.get()
    let next = prev.map(post => {
      let value = read.has(post.id)
      return post.read === value ? post : { ...post, read: value }
    })
    if (next.some((post, index) => post !== prev[index])) list.set(next)
  })
}
