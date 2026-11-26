import { nanoid } from 'nanoid'
import { atom, computed, type ReadableAtom } from 'nanostores'

import { loadAccount } from './account.ts'
import { getEnvironment } from './environment.ts'
import { errorToMessage, isRemoteError, UserFacingError } from './errors.ts'
import { type FeedValue, getFeedReading, loadFeed } from './feed.ts'
import { downloadArticle } from './full-text.ts'
import { nowInSeconds } from './lib/date.ts'
import { createDownloadTask, type DownloadTask } from './lib/download.ts'
import { findMediaInText, findSiteIcon } from './loader/common.ts'
import { findPostLoader, loaders } from './loader/index.ts'
import { laterMessages } from './messages/index.ts'
import {
  addPost,
  loadPostByUrl,
  loadThreadPosts,
  type NewPost,
  type OriginPost,
  type PostAuthor,
  type PostValue,
  type ReaderPost,
  type ReaderPostRow,
  toReaderPost,
  uniqueMedia
} from './post.ts'
import { trackInterest } from './reactions.ts'
import {
  getCrdt,
  getDatabase,
  getTables,
  lazyDbQuery,
  type PostChanges
} from './schema.ts'

export const laterCount = lazyDbQuery(
  db => db.store<{ total: number }>`
    SELECT COUNT("id") AS "total" FROM "posts"
    WHERE "later" IS NOT NULL AND "read" = 0 AND "merged" = 0
  `,
  rows => rows[0]!.total
)

/**
 * Read later has no pages: it changes on every saved or moved post.
 */
export function loadLaterPosts(): ReadableAtom<ReaderPost[] | undefined> {
  let store = getDatabase().store<ReaderPostRow>`
      SELECT "id", "media", "mediaSizes", "originId", "paid",
        "publishedAt", "sortedAt", "later", "read", "title", "url",
        "feedId", "author",
        "preview", "quoted", "lang", "poll", "replied",
        "repostedBy", "threadId", "unsupported", "warning",
        (SELECT COUNT(*) FROM "posts" AS "thread"
          WHERE "thread"."later" IS NOT NULL
            AND "thread"."threadId" = "posts"."threadId"
            AND "thread"."author" ->> 'feedId' IS "posts"."author" ->> 'feedId'
            AND "thread"."author" ->> 'accountId'
              IS "posts"."author" ->> 'accountId') AS "threadSize",
        CASE WHEN "threadId" <> "originId"
          THEN (SELECT COUNT(*) FROM "posts" AS "thread"
            WHERE "thread"."later" IS NOT NULL
              AND "thread"."threadId" = "posts"."threadId"
              AND "thread"."author" ->> 'feedId' IS "posts"."author" ->> 'feedId'
              AND "thread"."author" ->> 'accountId'
                IS "posts"."author" ->> 'accountId'
              AND "thread"."publishedAt" < "posts"."publishedAt") + 1
          ELSE 1 END AS "threadPosition",
        NULLIF("intro", '') AS "intro",
        CASE WHEN COALESCE("intro", '') = '' THEN "full" END AS "full",
        COALESCE(NULLIF("intro", '') <> "full", 0) AS "more"
      FROM "posts"
      WHERE "later" IS NOT NULL AND "read" IN (0, 1) AND "merged" = 0
      ORDER BY "later" DESC, "id" DESC
    `
  return computed(store, rows => {
    return rows.status === 'ready' ? rows.value.map(toReaderPost) : undefined
  })
}

let movedListeners = new Set<(ids: string[]) => void>()

/**
 * Readers remove the moved posts from the page at once.
 */
export function onPostsMoved(listener: (ids: string[]) => void): () => void {
  movedListeners.add(listener)
  return () => {
    movedListeners.delete(listener)
  }
}

function emitMoved(ids: string[]): void {
  for (let listener of movedListeners) listener(ids)
}

type LaterSource = { accountId: string } | { feedId: string }

function cleanAuthor(author: PostAuthor): PostAuthor {
  return {
    ...(author.avatar && { avatar: author.avatar }),
    title: author.title,
    ...(author.url && { url: author.url })
  }
}

function toAuthor(
  part: PostValue,
  feed: FeedValue | undefined,
  source: LaterSource
): null | PostAuthor {
  if (part.author) return { ...part.author, ...source }
  if (feed) {
    return {
      ...source,
      ...(feed.avatar && { avatar: feed.avatar }),
      loader: feed.loader,
      title: feed.title,
      url: feed.url
    }
  }
  return null
}

/**
 * One write for all parts of the thread with the same author, since every
 * write re-runs all live queries of the posts.
 */
async function updateParts(
  parts: PostValue[],
  authorOf: (part: PostValue) => null | PostAuthor,
  changes: Omit<PostChanges, 'author'>
): Promise<void> {
  let groups = new Map<string, [author: null | PostAuthor, ids: string[]]>()
  for (let part of parts) {
    let author = authorOf(part)
    let key = JSON.stringify(author)
    let group = groups.get(key) ?? [author, []]
    group[1].push(part.id)
    groups.set(key, group)
  }
  for (let [author, ids] of groups.values()) {
    await getTables().posts.update(ids, { ...changes, author })
  }
}

export async function moveToLater(post: PostValue): Promise<void> {
  let sourceId = post.feedId ?? post.accountId
  if (!sourceId) return
  let source: LaterSource = post.feedId
    ? { feedId: post.feedId }
    : { accountId: sourceId }
  let feed = post.feedId ? await loadFeed(post.feedId) : undefined
  let parts = post.threadId
    ? await loadThreadPosts(sourceId, post.threadId)
    : [post]
  await updateParts(parts, part => toAuthor(part, feed, source), {
    accountId: null,
    feedId: null,
    later: nowInSeconds(),
    read: 0,
    reading: 'slow'
  })
  if (post.feedId) trackInterest(post, 'open')
  emitMoved(parts.map(part => part.id))
}

function hasFeedAuthor(post: OriginPost | PostValue): post is PostValue {
  return 'later' in post && !!post.author?.loader
}

/**
 * Page, which was added to Read later by link, has the site in the author.
 */
export function getPageAuthor(
  post: OriginPost | PostValue
): PostAuthor | undefined {
  return 'later' in post && post.author?.loader === 'page'
    ? post.author
    : undefined
}

/**
 * Post, which was moved from a feed to Read later, keeps the feed
 * in the author. Screens with the post’s feed don’t need it twice.
 */
export function withoutFeedAuthor(
  post: OriginPost | PostValue
): OriginPost | PostValue {
  return hasFeedAuthor(post) ? { ...post, author: null } : post
}

export function canReturnFromLater(post: {
  author?: null | Pick<PostAuthor, 'accountId' | 'feedId'>
  later?: null | number
}): boolean {
  return !!post.later && !!(post.author?.feedId || post.author?.accountId)
}

export async function returnFromLater(post: PostValue): Promise<void> {
  let feedId = post.author?.feedId
  let accountId = post.author?.accountId
  let feed = feedId ? await loadFeed(feedId) : undefined
  let account = accountId ? await loadAccount(accountId) : undefined
  if (!feed && !account) return
  let reading = feed
    ? getFeedReading(
        feed,
        feed.accountId ? await loadAccount(feed.accountId) : undefined
      )
    : 'fast'
  let parts = post.threadId
    ? await loadThreadPosts((feed ?? account)!.id, post.threadId)
    : [post]
  await updateParts(
    parts,
    part => {
      return part.author && part.author.url !== feed?.url
        ? cleanAuthor(part.author)
        : null
    },
    {
      accountId: account ? account.id : null,
      feedId: feed ? feed.id : null,
      later: null,
      read: 0,
      reading
    }
  )
  emitMoved(parts.map(part => part.id))
}

function toLaterPost(
  origin: OriginPost,
  author: PostAuthor | undefined,
  date: number
): NewPost {
  let source = origin.author ?? author
  return {
    ...(source && {
      author: {
        ...cleanAuthor(source),
        ...(source.loader && { loader: source.loader })
      }
    }),
    full: origin.full,
    id: nanoid(),
    intro: origin.intro,
    lang: origin.lang,
    later: nowInSeconds(),
    media: origin.media,
    originId: origin.originId,
    paid: origin.paid,
    poll: origin.poll,
    preview: origin.preview,
    publishedAt: date,
    quoted: origin.quoted,
    reading: 'slow',
    replied: origin.replied,
    sortedAt: date,
    title: origin.title,
    unsupported: origin.unsupported,
    url: origin.url,
    warning: origin.warning
  }
}

/**
 * Preview of the feed and the post by URL are not in the database,
 * but the feed’s post with the same URL could be.
 */
export async function saveOriginForLater(origin: OriginPost): Promise<void> {
  let stored = origin.url ? await loadPostByUrl(origin.url) : undefined
  if (stored?.feedId || stored?.accountId) {
    await moveToLater(stored)
  } else if (!stored) {
    await addPost(
      toLaterPost(origin, undefined, origin.publishedAt ?? nowInSeconds())
    )
  }
}

function toPageUrl(input: string): string {
  let text = input.trim()
  let url = URL.parse(/^[a-z][\w+.-]*:/i.test(text) ? text : `https://${text}`)
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    throw new UserFacingError(laterMessages.get().notUrl)
  }
  return url.href
}

/**
 * Post from social network is loaded by its loader, other pages
 * by Mozilla’s Readability. Robots rules are not checked, since user asked
 * for this page like in the browser.
 */
export async function addLaterPost(
  task: DownloadTask,
  input: string
): Promise<'added' | 'already'> {
  let url = toPageUrl(input)
  let saved = await getCrdt().select`
    SELECT "id" FROM "posts"
    WHERE "later" IS NOT NULL AND "read" = 0 AND "url" = ${url}
    LIMIT 1
  `
  if (saved.length > 0) return 'already'
  let now = nowInSeconds()
  let name = findPostLoader(url)
  let getPostByUrl = name && loaders[name].getPostByUrl
  if (getPostByUrl) {
    let origin = await getPostByUrl(task, url)
    await addPost(toLaterPost({ ...origin, url }, undefined, now))
  } else {
    let article = await downloadArticle(task, url)
    let avatar = await findSiteIcon(task, url)
    await addPost(
      toLaterPost(
        {
          full: article.content,
          id: '',
          media: uniqueMedia(findMediaInText(article.content)),
          originId: url,
          title: article.title ?? url,
          url
        },
        {
          ...(avatar && { avatar }),
          loader: 'page',
          title: article.siteName ?? new URL(url).hostname,
          url: new URL('/', url).href
        },
        now
      )
    )
  }
  return 'added'
}

export interface LaterAdding {
  add(url: Promise<string> | string): Promise<boolean>
  added: ReadableAtom<boolean>
  adding: ReadableAtom<boolean>
  already: ReadableAtom<boolean>
  destroy(): void
  failure: ReadableAtom<string | undefined>
}

export function createLaterAdding(): LaterAdding {
  let task = createDownloadTask()
  let $added = atom(false)
  let $adding = atom(false)
  let $already = atom(false)
  let $failure = atom<string | undefined>()
  return {
    async add(url) {
      $added.set(false)
      $adding.set(true)
      $already.set(false)
      $failure.set(undefined)
      try {
        let result = await addLaterPost(task, await url)
        $added.set(result === 'added')
        $already.set(result === 'already')
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return false
        if (!(e instanceof UserFacingError) && !isRemoteError(e)) {
          getEnvironment().warn(e)
        }
        $failure.set(errorToMessage(e))
      } finally {
        $adding.set(false)
      }
      return $added.get()
    },
    added: $added,
    adding: $adding,
    already: $already,
    destroy() {
      task.destroy()
    },
    failure: $failure
  }
}
