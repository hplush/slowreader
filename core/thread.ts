import type { FeedValue } from './feed.ts'
import type { DownloadTask } from './lib/download.ts'
import { type Loader, loaders } from './loader/index.ts'
import {
  changePost,
  getPostId,
  loadPost,
  type OriginPost,
  type ParsedPost,
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

/**
 * Turns `selfReplyTo` links of the new posts into threads.
 *
 * Readers show the thread as its first post, other posts are `merged` into
 * its card. The first post gets `sortedAt` of the newest post to move
 * the thread to the top with every new reply. If refresh has no earlier
 * parts of the thread, it loads them again to show new parts in the context
 * and with the real size of the thread.
 *
 * Returns the new posts and the restored earlier posts to add.
 */
export async function linkThreads(
  task: DownloadTask,
  feed: Pick<FeedValue, 'id' | 'loader' | 'url'>,
  posts: OriginPost[]
): Promise<OriginPost[]> {
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
        Math.max(newest.get(threadId) ?? 0, post.publishedAt ?? 0)
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
