import { delay } from 'nanodelay'

import { getEnvironment } from './environment.ts'
import { HTTPStatusError, NetworkError, ParseError } from './errors.ts'
import type { FeedValue } from './feed.ts'
import type { DownloadTask } from './lib/download.ts'
import { type Loader, loaders } from './loader/index.ts'
import {
  addPost,
  changePost,
  getPostId,
  getSortedAt,
  loadPost,
  loadThreadPosts,
  type OriginPost,
  type ParsedPost,
  processOriginPost,
  type PostValue
} from './post.ts'
import type {
  PostsList,
  PostsListLoader,
  PostsListResult
} from './posts-list.ts'

function loadByOriginId(
  feedId: string,
  originId: string
): Promise<PostValue | undefined> {
  return loadPost(getPostId(feedId, { id: originId, originId }))
}

/**
 * The thread is read as a whole, so its earlier posts should be unread
 * again to not be deleted with read posts, when new parts arrive.
 */
async function reopenPost(
  feedId: string,
  originId: string,
  threadId: string
): Promise<boolean> {
  let post = await loadByOriginId(feedId, originId)
  if (!post) return false
  let changes: Parameters<typeof changePost>[1] = {}
  if (post.read) changes.read = false
  if (post.threadId !== threadId) changes.threadId = threadId
  if (Object.keys(changes).length > 0) await changePost(post.id, changes)
  return true
}

async function loadThreadDescendants(
  task: DownloadTask,
  feed: Pick<FeedValue, 'loader' | 'url'>,
  originId: string,
  attempt = 1
): Promise<ParsedPost[]> {
  try {
    return (
      (await loaders[feed.loader].getThreadDescendants?.(
        task,
        feed.url,
        originId
      )) ?? []
    )
  } catch (e) {
    let temporary = NetworkError.is(e) || HTTPStatusError.is(e, /^5\d\d$/)
    if (temporary && attempt < 3) {
      await delay(500 * attempt)
      return loadThreadDescendants(task, feed, originId, attempt + 1)
    } else if (temporary || HTTPStatusError.is(e) || e instanceof ParseError) {
      getEnvironment().warn(e)
      return []
    } else {
      throw e
    }
  }
}

/**
 * Feed has only the repost of the thread start, since next parts are posted
 * by another author.
 */
async function loadRepostedParts(
  task: DownloadTask,
  feed: Pick<FeedValue, 'loader' | 'url'>,
  posts: OriginPost[]
): Promise<OriginPost[]> {
  let threads = await Promise.all(
    posts
      .filter(post => post.repostedBy && post.hasReplies)
      .map(async start => {
        let parts = await loadThreadDescendants(task, feed, start.originId)
        // Mastodon links the first part to the original post, not to repost
        return parts.map((part, index) => ({
          ...part,
          id: part.originId,
          selfReplyTo: (parts[index - 1] ?? start).originId
        }))
      })
  )
  let known = new Set<string>()
  return threads.flat().filter(part => {
    // Mastodon has different IDs for two reposts of the same post
    if (known.has(part.originId)) return false
    known.add(part.originId)
    return true
  })
}

/**
 * Turns `selfReplyTo` links of the new posts into threads.
 *
 * Readers show the thread as its first post, other posts are `merged` into
 * its card. The first post gets `sortedAt` of the newest post to move
 * the thread to the top with every new reply. If refresh has no earlier
 * parts of the thread, it loads them again to show new parts in the context
 * and with the real size of the thread.
 *
 * Returns the new posts, the restored earlier posts, and the loaded parts
 * of reposted threads to add.
 */
export async function linkThreads(
  task: DownloadTask,
  feed: Pick<FeedValue, 'id' | 'loader' | 'url'>,
  found: OriginPost[]
): Promise<OriginPost[]> {
  let parts = await loadRepostedParts(task, feed, found)
  let partIds = new Set(parts.map(part => part.originId))
  let posts = [
    // Thread part can be reposted too
    ...found.filter(post => !partIds.has(post.originId)),
    ...parts
  ]
  let byOrigin = new Map(posts.map(post => [post.originId, post]))
  let threads = new Map<OriginPost, string | undefined>()
  let restored: OriginPost[] = []

  async function findThread(post: OriginPost): Promise<string | undefined> {
    if (threads.has(post)) return threads.get(post)
    let threadId: string | undefined
    let parentId = post.selfReplyTo
    if (!parentId) {
      threadId = undefined
    } else if (byOrigin.has(parentId)) {
      let parent = byOrigin.get(parentId)!
      threadId = (await findThread(parent)) ?? parentId
    } else {
      let stored = await loadByOriginId(feed.id, parentId)
      threadId = stored ? (stored.threadId ?? stored.originId) : undefined
      if (!threadId || !(await reopenPost(feed.id, threadId, threadId))) {
        threadId = await restoreAncestors(post)
      }
    }
    threads.set(post, threadId)
    return threadId
  }

  async function restoreAncestors(
    post: OriginPost
  ): Promise<string | undefined> {
    let ancestors =
      (await loaders[feed.loader].getThreadAncestors?.(
        task,
        feed.url,
        post.originId
      )) ?? []
    let threadId = ancestors[0]?.originId
    if (!threadId) return undefined
    for (let ancestor of ancestors) {
      if (byOrigin.has(ancestor.originId)) continue
      if (!(await reopenPost(feed.id, ancestor.originId, threadId))) {
        let added = { ...ancestor, id: ancestor.originId }
        byOrigin.set(ancestor.originId, added)
        threads.set(added, threadId)
        restored.push(added)
      }
    }
    return threadId
  }

  let starts = new Set<string>()
  for (let post of posts) {
    let threadId = await findThread(post)
    if (threadId) starts.add(threadId)
  }

  let all = [...posts, ...restored]
  function getThreadId(post: OriginPost): string | undefined {
    let threadId =
      threads.get(post) ?? (post.selfReplyTo ? undefined : post.originId)
    return threadId && starts.has(threadId) ? threadId : undefined
  }
  let newest = new Map<string, number>()
  for (let post of all) {
    let threadId = getThreadId(post)
    if (threadId) {
      newest.set(
        threadId,
        Math.max(newest.get(threadId) ?? 0, getSortedAt(post) ?? 0)
      )
    }
  }
  for (let [threadId, sortedAt] of newest) {
    if (byOrigin.has(threadId)) continue
    let start = await loadByOriginId(feed.id, threadId)
    if (start && start.sortedAt < sortedAt) {
      await changePost(start.id, { sortedAt })
    }
  }

  return all.map(post => {
    let threadId = getThreadId(post)
    let saved = { ...post }
    delete saved.selfReplyTo
    delete saved.hasReplies
    if (!threadId) return saved
    if (threadId !== post.originId) {
      return { ...saved, merged: true, threadId }
    }
    let sortedAt = newest.get(threadId)
    // Without dates `processOriginPost()` will use the time of refresh
    if (!sortedAt) return { ...saved, merged: false, threadId }
    return { ...saved, merged: false, sortedAt, threadId }
  })
}

/**
 * Feed could miss new parts, like parts of the reposted thread added after
 * the repost, so the opened thread asks the loader for them.
 *
 * Returns all posts of the thread.
 */
export async function updateThread(
  task: DownloadTask,
  feed: Pick<FeedValue, 'id' | 'loader' | 'url'>,
  start: PostValue
): Promise<PostValue[]> {
  let threadId = start.threadId ?? start.originId
  let posts = await loadThreadPosts(feed.id, threadId)
  let loader = loaders[feed.loader]
  if (!loader.getThreadDescendants) return posts
  // Reposts from old versions have the repost’s date in `publishedAt`,
  // so the thread start can be after its parts
  let last = posts.filter(post => post.originId !== threadId).at(-1) ?? start
  let known = new Set(posts.map(post => post.originId))
  let added = (
    await loader.getThreadDescendants(task, feed.url, last.originId)
  ).filter(post => !known.has(post.originId))
  if (added.length === 0) return posts
  // Feed had no parts of the reposted thread on refresh
  if (!start.threadId) await changePost(start.id, { threadId })
  await addPost(
    added.map(post => {
      let saved = {
        ...post,
        id: post.originId,
        merged: true,
        threadId
      }
      delete saved.selfReplyTo
      delete saved.hasReplies
      return {
        ...processOriginPost(saved, { feedId: feed.id }, start.reading),
        read: start.read
      }
    })
  )
  return loadThreadPosts(feed.id, threadId)
}

/**
 * Post opened by URL is not in the database, so refresh did not link
 * its thread. Returns all posts of the thread from the start.
 */
export async function loadThreadByUrl(
  task: DownloadTask,
  loader: Loader,
  post: OriginPost & { url: string }
): Promise<OriginPost[]> {
  let [ancestors, descendants] = await Promise.all([
    post.selfReplyTo
      ? loader.getThreadAncestors?.(task, post.url, post.originId)
      : undefined,
    loader.getThreadDescendants?.(task, post.url, post.originId)
  ])
  let toPart = (part: ParsedPost): OriginPost => ({
    author: post.author,
    ...part,
    id: part.originId
  })
  return [
    ...(ancestors ?? []).map(toPart),
    post,
    ...(descendants ?? []).map(toPart)
  ]
}

/**
 * Preview post is not saved, and the repost’s `originId` could be from
 * another server, so the thread is loaded by the post’s own URL.
 */
export async function loadPreviewThread(
  task: DownloadTask,
  loader: Loader,
  url: string
): Promise<OriginPost[]> {
  let post = await loader.getPostByUrl!(task, url)
  return loadThreadByUrl(task, loader, { ...post, url })
}

/**
 * Feed preview shows the thread as its first post, like readers. Without
 * earlier parts, the next page would replace the shown reply by its start.
 */
export function addThreadStarts(
  task: DownloadTask,
  loader: Loader,
  feedUrl: string,
  posts: PostsList
): PostsListLoader {
  let known = new Set<string>()

  async function withStarts(page: ParsedPost[]): Promise<ParsedPost[]> {
    let added = page.filter(post => !known.has(post.originId))
    for (let post of added) known.add(post.originId)
    let restored: ParsedPost[] = []
    for (let post of added) {
      if (post.selfReplyTo && !known.has(post.selfReplyTo)) {
        let ancestors = await loader
          .getThreadAncestors?.(task, feedUrl, post.originId)
          // Preview can show the reply without its thread
          .catch(() => [])
        for (let ancestor of ancestors ?? []) {
          if (known.has(ancestor.originId)) continue
          known.add(ancestor.originId)
          restored.push(ancestor)
        }
      }
    }
    return [...added, ...restored]
  }

  async function next(): Promise<PostsListResult> {
    let page = await posts.next()
    let error = posts.get().error
    if (error) throw error
    return [await withStarts(page), posts.get().hasNext ? next : undefined]
  }

  return async () => {
    if (posts.get().isLoading) await posts.loading
    let error = posts.get().error
    if (error) throw error
    return [
      await withStarts(posts.get().list),
      posts.get().hasNext ? next : undefined
    ]
  }
}
