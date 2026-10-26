import { withMeta, type WithoutMeta } from '@logux/client/db'
import { formatter } from '@nanostores/i18n'
import type { SqlStore } from '@nanostores/sql'
import { atom, effect, onMount, type WritableAtom } from 'nanostores'

import { loadFeed } from './feed.ts'
import { loadFilterChecker } from './filter.ts'
import { $locale } from './i18n.ts'
import {
  endsWithEllipsis,
  sanitizeDOM,
  stripHTML,
  truncateDOM
} from './lib/html.ts'
import { truncateText } from './lib/text.ts'
import type { LoaderName } from './loader/index.ts'
import {
  getCrdt,
  getTables,
  type MediaSize,
  type NewPost,
  openedDatabase,
  type PostAuthor,
  type PostChanges,
  type PostMedia,
  type PostPoll,
  type PostPreview,
  type PostValue,
  type QuotedPost
} from './schema.ts'

export type {
  MediaSize,
  NewPost,
  PostAuthor,
  PostMedia,
  PostPoll,
  PostPreview,
  PostValue,
  QuotedPost
}

export type ParsedPost = {
  author?: PostAuthor
  full?: string
  /**
   * Post is not a reply and has replies. Loader’s hint to not ask for parts
   * of every reposted post. Not saved to the database.
   */
  hasReplies?: true
  intro?: string
  lang?: string
  media?: PostMedia[]
  mediaSizes?: (MediaSize | null)[]
  merged?: boolean
  originId: string
  poll?: PostPoll
  preview?: PostPreview
  publishedAt?: number
  quoted?: QuotedPost
  replied?: QuotedPost
  repostedBy?: PostAuthor
  sortedAt?: number
  selfReplyTo?: string
  threadId?: string
  title?: string
  unsupported?: true
  updatedAt?: number
  url?: string
  warning?: string
}

export type OriginPost = {
  id: string
  threadParts?: OriginPost[]
} & ParsedPost

/**
 * Post’s text from a feed or from the database. Database returns `null`
 * for missing values, while loaders return `undefined`.
 */
export type PostContent = {
  full?: null | string
  intro?: null | string
  originId: string
  publishedAt?: null | number
  title?: null | string
  url?: null | string
}

/**
 * The text which the card shows, in the two shapes the reader can load.
 *
 * The feed’s `intro` and the article never come together: `full` is loaded
 * only when the feed gave no `intro`, since only then the card has to cut
 * the article itself. `more` answers the other case, where the article
 * is compared with the intro in SQL.
 */
export type PostCardText = {
  url: null | string
} & (
  | { full: null | string; intro: null; more: 0 }
  | { full: null; intro: string; more: number }
)

/**
 * Feed or account, which loaded the post. Both tables have random IDs,
 * so queries can look for the source in both columns by a single ID.
 */
export type PostSource = { accountId: string } | { feedId: string }

export type ReaderMedia = { size?: MediaSize } & PostMedia

/**
 * Only the columns which the post card needs
 */
export type ReaderPostWith<Media> = {
  authorAvatar?: null | string
  authorLoader?: LoaderName
  authorTitle?: string
  authorUrl?: string
  media: Media
  threadSize: number
} & Pick<
  PostValue,
  | 'accountId'
  | 'author'
  | 'feedId'
  | 'id'
  | 'lang'
  | 'originId'
  | 'poll'
  | 'preview'
  | 'publishedAt'
  | 'quoted'
  | 'read'
  | 'replied'
  | 'repostedBy'
  | 'sortedAt'
  | 'threadId'
  | 'title'
  | 'unsupported'
  | 'warning'
> &
  PostCardText

export type ReaderPost = ReaderPostWith<ReaderMedia[]>

/**
 * The card of not yet added feed’s post. Keeps `origin` to open the post
 * popup without the database.
 */
export type PreviewPost = {
  media: ReaderMedia[]
  origin: OriginPost
  threadSize: number
} & Omit<OriginPost, 'full' | 'intro' | 'media' | 'url'> &
  PostCardText

/**
 * How much of the article the card shows, in chars of text.
 */
const INTRO_MIN = 300
const INTRO_MAX = 500

export function addPost(posts: NewPost[]): Promise<string[]>
export function addPost(fields: NewPost): Promise<string>
export function addPost(
  fields: NewPost | NewPost[]
): Promise<string[] | string> {
  return getTables().posts.create(fields)
}

export function getPost(postId: string): SqlStore<PostValue | undefined> {
  return getTables().posts.row(postId)
}

export function loadPost(postId: string): Promise<PostValue | undefined> {
  return getTables().posts.get(postId)
}

export function loadPostByUrl(url: string): Promise<PostValue | undefined> {
  return getTables().posts.load`WHERE "url" = ${url} LIMIT 1`.then(
    rows => rows[0]
  )
}

export function loadPosts(): Promise<PostValue[]> {
  return getTables().posts.load`ORDER BY "publishedAt" DESC`
}

/**
 * Load posts by pages to not keep all of them in memory during the export.
 */
export function loadPostsPage(
  limit: number,
  offset: number
): Promise<PostValue[]> {
  return getTables().posts.load`
    ORDER BY "publishedAt" DESC LIMIT ${limit} OFFSET ${offset}
  `
}

export function loadPostsByFeed(feedId: string): Promise<PostValue[]> {
  return getTables().posts.load`
    WHERE "feedId" = ${feedId} ORDER BY "publishedAt" DESC
  `
}

/**
 * All posts of the thread in the order of writing.
 */
export function loadThreadPosts(
  sourceId: string,
  threadId: string
): Promise<PostValue[]> {
  return getTables().posts.load`
    WHERE ("feedId" = ${sourceId} OR "accountId" = ${sourceId})
      AND "threadId" = ${threadId}
    ORDER BY "publishedAt" ASC, "id" ASC
  `
}

/**
 * Origin IDs of feed’s posts to not add the same post twice, if the previous
 * refresh was stopped in the middle of the feed’s pagination.
 */
export function loadPostOriginIdsByFeed(feedId: string): Promise<string[]> {
  return getCrdt().select<{
    originId: string
  }>`SELECT "originId" FROM "posts" WHERE "feedId" = ${feedId}`.then(rows =>
    rows.map(row => row.originId)
  )
}

/**
 * The same for the home timeline, which puts posts to the virtual feeds too.
 */
export function loadPostOriginIdsByAccount(
  accountId: string
): Promise<string[]> {
  return getCrdt().select<{ originId: string }>`
      SELECT "originId" FROM "posts" WHERE "accountId" = ${accountId}
        OR "feedId" IN (
          SELECT "id" FROM "feeds" WHERE "accountId" = ${accountId}
        )
    `.then(rows => rows.map(row => row.originId))
}

export function hasUnreadPosts(
  reading: PostValue['reading'],
  target: { categoryId?: string; feedId?: string } = {}
): Promise<boolean> {
  let crdt = getCrdt()
  let rows: Promise<unknown[]>
  if (target.feedId) {
    rows = crdt.select`
      SELECT "id" FROM "posts"
      WHERE "reading" = ${reading} AND "read" = 0 AND "merged" = 0
        AND "feedId" = ${target.feedId}
      LIMIT 1
    `
  } else if (target.categoryId) {
    rows = crdt.select`
      SELECT "posts"."id" FROM "posts"
      LEFT JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      LEFT JOIN "accounts" ON "accounts"."id" = "posts"."accountId"
      WHERE "posts"."reading" = ${reading} AND "posts"."read" = 0
        AND "posts"."merged" = 0
        AND COALESCE("feeds"."categoryId", "accounts"."categoryId")
          = ${target.categoryId}
      LIMIT 1
    `
  } else {
    rows = crdt.select`
      SELECT "id" FROM "posts"
      WHERE "reading" = ${reading} AND "read" = 0 AND "merged" = 0 LIMIT 1
    `
  }
  return rows.then(list => list.length > 0)
}

export function deletePost(postId: string[] | string): Promise<void> {
  return getTables().posts.delete(postId)
}

export async function deleteFastPostsBefore(time: number): Promise<void> {
  let rows = await getCrdt().select<{ id: string }>`
    SELECT "id" FROM "posts" WHERE "reading" = 'fast' AND "sortedAt" < ${time}
  `
  if (rows.length > 0) await deletePost(rows.map(row => row.id))
}

export function changePost(
  postId: string[] | string,
  changes: PostChanges
): Promise<void> {
  return getTables().posts.update(postId, changes)
}

/**
 * Readers show the thread as a single post, so the whole thread is read
 * with it.
 */
export async function changeRead(
  postIds: string[],
  read: boolean
): Promise<void> {
  let parts = await Promise.all(
    postIds.map(id => {
      return getCrdt().select<{ id: string }>`
        SELECT "part"."id" FROM "posts" AS "part"
        JOIN "posts" AS "shown" ON "shown"."threadId" = "part"."threadId"
          AND "shown"."feedId" IS "part"."feedId"
          AND "shown"."accountId" IS "part"."accountId"
        WHERE "shown"."id" = ${id} AND "part"."id" <> ${id}
      `
    })
  )
  await changePost([...postIds, ...parts.flat().map(part => part.id)], {
    read
  })
}

/**
 * Stable ID is generated from post to prevent post duplicates.
 *
 * The hash is cyrb53. `crypto.subtle.digest()` hashes better, but it is async.
 */
export function getPostId(sourceId: string, origin: OriginPost): string {
  let key = `${sourceId} ${origin.originId || origin.url || origin.id}`
  let hash1 = 0xdeadbeef
  let hash2 = 0x41c6ce57
  for (let i = 0; i < key.length; i++) {
    let code = key.charCodeAt(i)
    hash1 = Math.imul(hash1 ^ code, 2654435761)
    hash2 = Math.imul(hash2 ^ code, 1597334677)
  }
  hash1 =
    Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^
    Math.imul(hash2 ^ (hash2 >>> 13), 3266489909)
  hash2 =
    Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^
    Math.imul(hash1 ^ (hash1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & hash2) + (hash1 >>> 0)).toString(36)
}

/**
 * Show the thread in the feed preview like readers do: on the place of its
 * newest post with the content of its first post. Parts without the loaded
 * previous post stay as separated posts.
 */
export function collapseThreads(posts: readonly OriginPost[]): OriginPost[] {
  let byOrigin = new Map(posts.map(post => [post.originId, post]))
  function findStart(post: OriginPost): OriginPost {
    let parent = post.selfReplyTo && byOrigin.get(post.selfReplyTo)
    return parent ? findStart(parent) : post
  }
  let parts = new Map<OriginPost, OriginPost[]>()
  for (let post of posts) {
    let start = findStart(post)
    if (start !== post) parts.set(start, [...(parts.get(start) ?? []), post])
  }
  let placed = new Set<OriginPost>()
  let result: OriginPost[] = []
  for (let post of posts) {
    let start = findStart(post)
    if (placed.has(start)) continue
    placed.add(start)
    let threadParts = parts.get(start)
    if (threadParts) {
      result.push({
        ...start,
        threadParts: threadParts.toSorted(
          (a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0)
        )
      })
    } else {
      result.push(start)
    }
  }
  return result
}

export function toPreviewPost(origin: OriginPost): PreviewPost {
  let url = origin.url ?? null
  let text: PostCardText = origin.intro
    ? {
        full: null,
        intro: origin.intro,
        more: origin.full && origin.full !== origin.intro ? 1 : 0,
        url
      }
    : { full: origin.full ?? null, intro: null, more: 0, url }
  return {
    ...origin,
    ...text,
    media: addMediaSizes(origin.media, origin.mediaSizes),
    origin,
    threadSize: (origin.threadParts?.length ?? 0) + 1
  }
}

/**
 * Reposts have the time of the repost in `sortedAt`.
 */
export function getSortedAt(post: {
  publishedAt?: null | number
  sortedAt?: number
}): number | undefined {
  return post.sortedAt ?? post.publishedAt ?? undefined
}

export function getSourceId(source: PostSource): string {
  return 'feedId' in source ? source.feedId : source.accountId
}

export function processOriginPost(
  origin: OriginPost,
  source: PostSource,
  reading: PostValue['reading']
): { id: string } & NewPost {
  let publishedAt = origin.publishedAt ?? Math.round(Date.now() / 1000)
  return {
    ...origin,
    ...source,
    id: getPostId(getSourceId(source), origin),
    publishedAt,
    reading,
    sortedAt: origin.sortedAt ?? publishedAt
  }
}

/**
 * The intro’s DOM and `true` when the article has more text than the intro.
 * The intro of the thread ends with `…` to show its next posts.
 *
 * The card gets a sanitized node and not a string: the text is sanitized
 * once here, instead of being serialized back and parsed and sanitized
 * again on the render.
 */
export function getPostIntro(
  post: Pick<ReaderPost, 'threadSize'> & PostCardText
): [Element, boolean] {
  let intro: Element
  let more: boolean
  if (post.intro !== null) {
    intro = sanitizeDOM(post.intro)
    more = post.more === 1
  } else if (post.full !== null) {
    intro = sanitizeDOM(post.full)
    more = truncateDOM(intro, INTRO_MIN, INTRO_MAX)
  } else {
    intro = sanitizeDOM('')
    more = false
  }
  if (post.threadSize > 1 && !endsWithEllipsis(intro)) {
    let ellipsis = intro.ownerDocument.createElement('p')
    ellipsis.append('…')
    intro.append(ellipsis)
  }
  return [intro, more]
}

/**
 * Text cut from the article shows only some of its images, but the rest
 * should not fill the card.
 */
export function getMediaOutsideText(
  media: ReaderMedia[],
  text: Element,
  cut: boolean
): ReaderMedia[] {
  if (cut) return media.filter(i => !i.fromText)
  let shown = new Set(
    [...text.querySelectorAll('img')].map(i => i.getAttribute('src'))
  )
  return media.filter(i => !shown.has(i.url))
}

function toOneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ')
}

export function getPostTitle(post: PostContent): string {
  if (post.title) {
    return stripHTML(post.title)
  } else if (post.intro) {
    return toOneLine(truncateText(stripHTML(post.intro), 40, 80))
  } else if (post.full) {
    return toOneLine(truncateText(stripHTML(post.full), 40, 80))
  } else if (post.publishedAt) {
    return formatter($locale)
      .get()
      .time(new Date(post.publishedAt * 1000))
  } else {
    return stripHTML(post.originId)
  }
}

export async function recalcPostsReading(feedId: string): Promise<void> {
  let feed = await loadFeed(feedId)
  if (!feed) return

  let [filters, posts] = await Promise.all([
    loadFilterChecker(feedId),
    loadPostsByFeed(feedId)
  ])

  let fast: string[] = []
  let slow: string[] = []
  for (let post of posts) {
    let reading = filters(post) ?? feed.reading
    if (reading === 'delete' || reading === post.reading) continue
    if (reading === 'fast') {
      fast.push(post.id)
    } else {
      slow.push(post.id)
    }
  }

  await Promise.all([
    changePost(fast, { reading: 'fast' }),
    changePost(slow, { reading: 'slow' })
  ])
}

let testPostId = 0

export function testPost(
  post: Partial<WithoutMeta<PostValue>> = {}
): PostValue {
  testPostId += 1
  return withMeta<PostValue>({
    accountId: null,
    author: null,
    feedId: 'feed-1',
    full: null,
    id: `post-${testPostId}`,
    intro: `Post ${testPostId}`,
    lang: null,
    media: null,
    mediaSizes: null,
    merged: false,
    originId: `test-${testPostId}`,
    poll: null,
    preview: null,
    publishedAt: 1000,
    quoted: null,
    read: false,
    reading: 'fast',
    replied: null,
    repostedBy: null,
    sortedAt: post.publishedAt ?? 1000,
    threadId: null,
    title: null,
    unsupported: null,
    updatedAt: null,
    url: `http://example.com/${testPostId}`,
    warning: null,
    ...post
  })
}

function countPosts(
  store: WritableAtom<number | undefined>,
  reading: PostValue['reading']
): () => void {
  return effect(openedDatabase, db => {
    store.set(undefined)
    if (!db) return
    let $total = db.store<{ total: number }>`
      SELECT COUNT("originId") AS "total" FROM "posts"
      WHERE "reading" = ${reading}
    `
    return $total.subscribe(value => {
      store.set(value.status === 'loading' ? undefined : value.value[0]!.total)
    })
  })
}

export const fastPostsCount = atom<number | undefined>(undefined)
onMount(fastPostsCount, () => {
  return countPosts(fastPostsCount, 'fast')
})

export const slowPostsCount = atom<number | undefined>(undefined)
onMount(slowPostsCount, () => {
  return countPosts(slowPostsCount, 'slow')
})

export function uniqueMedia(media: PostMedia[]): PostMedia[] | undefined {
  if (media.length === 0) return undefined
  let unique = new Map<string, PostMedia>()
  // Feeds repeat the same file in enclosure and MRSS with different details
  for (let i of media) unique.set(i.url, { ...i, ...unique.get(i.url) })
  return [...unique.values()]
}

export function addMediaSizes(
  media: null | PostMedia[] | undefined,
  sizes: (MediaSize | null)[] | null | undefined
): ReaderMedia[] {
  return (media ?? []).map((item, index) => {
    let size = sizes?.[index]
    return size ? { ...item, size } : item
  })
}

export function getQuotedIntro(quoted: QuotedPost): Element {
  let text = sanitizeDOM(quoted.full ?? '')
  truncateDOM(text, INTRO_MIN, INTRO_MAX)
  return text
}
