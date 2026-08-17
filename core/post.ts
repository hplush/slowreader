import { withMeta, type WithoutMeta } from '@logux/client/db'
import { formatter } from '@nanostores/i18n'
import { atom, onMount, type ReadableAtom, type WritableAtom } from 'nanostores'

import { getEnvironment } from './environment.ts'
import { loadFeed } from './feed.ts'
import { loadFilterChecker } from './filter.ts'
import { $locale } from './i18n.ts'
import { sanitizeHtml, stripHTML, truncateHTML } from './lib/html.ts'
import { firstRow } from './lib/stores.ts'
import { truncateText } from './lib/text.ts'
import {
  getDatabase,
  getTables,
  type NewPost,
  type PostChanges,
  type PostValue,
  select
} from './schema.ts'

export type { NewPost, PostValue }

export type OriginPost = {
  full?: string
  intro?: string
  media?: string
  originId: string
  publishedAt?: number
  title?: string
  url?: string
}

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

export type PostMedia = {
  fromText?: boolean
  type: string
  url: string
}

export function addPost(posts: NewPost[]): Promise<string[]>
export function addPost(fields: NewPost): Promise<string>
export function addPost(
  fields: NewPost | NewPost[]
): Promise<string[] | string> {
  return getTables().posts.create(fields)
}

export function getPost(postId: string): ReadableAtom<PostValue | undefined> {
  return firstRow(getTables().posts.select`WHERE "id" = ${postId}`)
}

export function loadPost(postId: string): Promise<PostValue | undefined> {
  return select<PostValue>`SELECT * FROM "posts" WHERE "id" = ${postId}`.then(
    rows => rows[0]
  )
}

export function loadPosts(): Promise<PostValue[]> {
  return select<PostValue>`SELECT * FROM "posts" ORDER BY "publishedAt" DESC`
}

/**
 * Load posts by pages to not keep all of them in memory during the export.
 */
export function loadPostsPage(
  limit: number,
  offset: number
): Promise<PostValue[]> {
  return select<PostValue>`
    SELECT * FROM "posts" ORDER BY "publishedAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `
}

export function loadPostsByFeed(feedId: string): Promise<PostValue[]> {
  return select<PostValue>`
    SELECT * FROM "posts" WHERE "feedId" = ${feedId}
    ORDER BY "publishedAt" DESC
  `
}

export function loadPostIdsByFeed(feedId: string): Promise<string[]> {
  return select<{
    id: string
  }>`SELECT "id" FROM "posts" WHERE "feedId" = ${feedId}`.then(rows =>
    rows.map(row => row.id)
  )
}

/**
 * Origin IDs of feed’s posts to not add the same post twice, if the previous
 * refresh was stopped in the middle of the feed’s pagination.
 */
export function loadPostOriginIdsByFeed(feedId: string): Promise<string[]> {
  return select<{
    originId: string
  }>`SELECT "originId" FROM "posts" WHERE "feedId" = ${feedId}`.then(rows =>
    rows.map(row => row.originId)
  )
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

export function processOriginPost(
  origin: OriginPost,
  feedId: string,
  reading: PostValue['reading']
): NewPost {
  return {
    ...origin,
    feedId,
    publishedAt: origin.publishedAt ?? Date.now(),
    reading
  }
}

export function getPostIntro(post: PostContent): [string, boolean] {
  if (post.intro) {
    let more = !!post.full && post.full !== post.intro
    return [post.intro, more]
  } else if (post.full) {
    let sanitized = sanitizeHtml(post.full, post.url ?? undefined)
    let truncated = truncateHTML(sanitized, 300, 500)
    return [truncated, truncated !== sanitized]
  } else {
    return ['', false]
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
    feedId: 'feed-1',
    full: null,
    id: `post-${testPostId}`,
    intro: `Post ${testPostId}`,
    media: null,
    originId: `test-${testPostId}`,
    publishedAt: 1000,
    read: 0,
    reading: 'fast',
    title: null,
    url: `http://example.com/${testPostId}`,
    ...post
  })
}

function countPosts(
  store: WritableAtom<number | undefined>,
  reading: PostValue['reading']
): () => void {
  let $total = getDatabase().store<{ total: number }>`
    SELECT COUNT("originId") AS "total" FROM "posts" WHERE "reading" = ${reading}
  `
  return $total.subscribe(value => {
    store.set(value.isLoading ? undefined : value.value[0]!.total)
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

export function stringifyMedia(media: PostMedia[]): string | undefined {
  if (media.length === 0) return undefined
  let used = new Set<string>()
  let unique = media.filter(i => {
    let already = used.has(i.url)
    if (!already) used.add(i.url)
    return !already
  })
  return JSON.stringify(unique)
}

export function parseMedia(value: null | string | undefined): PostMedia[] {
  if (!value) return []
  try {
    return JSON.parse(value) as PostMedia[]
  } catch (e) {
    getEnvironment().warn(e)
    return []
  }
}
