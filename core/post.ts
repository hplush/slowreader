import { withMeta, type WithoutMeta } from '@logux/client/db'
import { formatter } from '@nanostores/i18n'
import type { SqlStore } from '@nanostores/sql'
import { atom, effect, onMount, type WritableAtom } from 'nanostores'

import { loadFeed } from './feed.ts'
import { loadFilterChecker } from './filter.ts'
import { $locale } from './i18n.ts'
import { sanitizeDOM, stripHTML, truncateDOM } from './lib/html.ts'
import { truncateText } from './lib/text.ts'
import {
  getCrdt,
  getTables,
  type MediaSize,
  type NewPost,
  openedDatabase,
  type PostAuthor,
  type PostChanges,
  type PostMedia,
  type PostPreview,
  type PostValue,
  type QuotedPost
} from './schema.ts'

export type {
  MediaSize,
  NewPost,
  PostAuthor,
  PostMedia,
  PostPreview,
  PostValue,
  QuotedPost
}

export type ParsedPost = {
  author?: PostAuthor
  full?: string
  intro?: string
  media?: PostMedia[]
  mediaSizes?: (MediaSize | null)[]
  originId: string
  preview?: PostPreview
  publishedAt?: number
  quoted?: QuotedPost
  repostedBy?: PostAuthor
  title?: string
  unsupported?: true
  updatedAt?: number
  url?: string
  warning?: string
}

export type OriginPost = { id: string } & ParsedPost

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

export type ReaderMedia = { size?: MediaSize } & PostMedia

/**
 * Only the columns which the post card needs
 */
export type ReaderPostWith<Media> = {
  authorTitle?: string
  authorUrl?: string
  media: Media
} & Pick<
  PostValue,
  'feedId' | 'id' | 'originId' | 'publishedAt' | 'read' | 'title'
> &
  PostCardText

export type ReaderPost = ReaderPostWith<ReaderMedia[]>

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

export function hasUnreadPosts(
  reading: PostValue['reading'],
  target: { categoryId?: string; feedId?: string } = {}
): Promise<boolean> {
  let crdt = getCrdt()
  let rows: Promise<unknown[]>
  if (target.feedId) {
    rows = crdt.select`
      SELECT "id" FROM "posts"
      WHERE "reading" = ${reading} AND "read" = 0
        AND "feedId" = ${target.feedId}
      LIMIT 1
    `
  } else if (target.categoryId) {
    rows = crdt.select`
      SELECT "posts"."id" FROM "posts"
      JOIN "feeds" ON "feeds"."id" = "posts"."feedId"
      WHERE "posts"."reading" = ${reading} AND "posts"."read" = 0
        AND "feeds"."categoryId" = ${target.categoryId}
      LIMIT 1
    `
  } else {
    rows = crdt.select`
      SELECT "id" FROM "posts"
      WHERE "reading" = ${reading} AND "read" = 0 LIMIT 1
    `
  }
  return rows.then(list => list.length > 0)
}

export function deletePost(postId: string[] | string): Promise<void> {
  return getTables().posts.delete(postId)
}

export function changePost(
  postId: string[] | string,
  changes: PostChanges
): Promise<void> {
  return getTables().posts.update(postId, changes)
}

/**
 * Stable ID is generated from post to prevent post duplicates.
 *
 * The hash is cyrb53. `crypto.subtle.digest()` hashes better, but it is async.
 */
export function getPostId(feedId: string, origin: OriginPost): string {
  let key = `${feedId} ${origin.originId || origin.url || origin.id}`
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

export function processOriginPost(
  origin: OriginPost,
  feedId: string,
  reading: PostValue['reading']
): { id: string } & NewPost {
  return {
    ...origin,
    feedId,
    id: getPostId(feedId, origin),
    publishedAt: origin.publishedAt ?? Math.round(Date.now() / 1000),
    reading
  }
}

/**
 * The intro’s DOM and `true` when the article has more text than the intro.
 *
 * The card gets a sanitized node and not a string: the text is sanitized
 * once here, instead of being serialized back and parsed and sanitized
 * again on the render.
 */
export function getPostIntro(post: PostCardText): [Element, boolean] {
  if (post.intro !== null) {
    return [sanitizeDOM(post.intro), post.more === 1]
  } else if (post.full !== null) {
    let article = sanitizeDOM(post.full)
    return [article, truncateDOM(article, INTRO_MIN, INTRO_MAX)]
  } else {
    return [sanitizeDOM(''), false]
  }
}

export function getPostTitle(post: PostContent): string {
  if (post.title) {
    return stripHTML(post.title)
  } else if (post.intro) {
    return truncateText(stripHTML(post.intro), 40, 80)
  } else if (post.full) {
    return truncateText(stripHTML(post.full), 40, 80)
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
    author: null,
    feedId: 'feed-1',
    full: null,
    id: `post-${testPostId}`,
    intro: `Post ${testPostId}`,
    media: null,
    mediaSizes: null,
    originId: `test-${testPostId}`,
    preview: null,
    publishedAt: 1000,
    quoted: null,
    read: false,
    reading: 'fast',
    repostedBy: null,
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
