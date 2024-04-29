import {
  changeSyncMapById,
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type Filter,
  type FilterStore,
  loadValue,
  type SyncMapStore,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'

import { getClient } from './client.js'
import { type FeedValue, getFeed } from './feed.js'
import { loadFilters, prepareFilters } from './filter.js'
import type { OptionalId } from './lib/stores.js'

export type OriginPost = {
  full?: string
  intro?: string
  media: string[]
  originId: string
  publishedAt?: number
  title?: string
  url?: string
}

export type PostValue = {
  feedId: string
  id: string
  publishedAt: number
  reading: 'fast' | 'slow'
} & Omit<OriginPost, 'publishedAt'>

export const Post = syncMapTemplate<PostValue>('posts', {
  offline: true,
  remote: false
})

export async function addPost(fields: OptionalId<PostValue>): Promise<string> {
  let id = fields.id ?? nanoid()
  await createSyncMap(getClient(), Post, { id, ...fields })
  return id
}

export function getPosts(
  filter: Filter<PostValue> = {}
): FilterStore<PostValue> {
  return createFilter(getClient(), Post, filter)
}

export async function loadPosts(
  filter: Filter<PostValue> = {}
): Promise<PostValue[]> {
  let value = await loadValue(getPosts(filter))
  return value.list
}

export function getPost(postId: string): SyncMapStore<PostValue> {
  return Post(postId, getClient())
}

export async function loadPost(postId: string): Promise<PostValue | undefined> {
  return loadValue(Post(postId, getClient()))
}

export function deletePost(postId: string): Promise<void> {
  return deleteSyncMapById(getClient(), Post, postId)
}

export async function changePost(
  postId: string,
  changes: Partial<PostValue>
): Promise<void> {
  return changeSyncMapById(getClient(), Post, postId, changes)
}

export function processOriginPost(
  origin: OriginPost,
  feedId: string,
  reading: PostValue['reading']
): PostValue {
  return {
    ...origin,
    feedId,
    id: nanoid(),
    publishedAt: origin.publishedAt ?? Date.now(),
    reading
  }
}

export function getPostContent(post: OriginPost): string {
  return post.full ?? post.intro ?? ''
}

export function getPostIntro(post: OriginPost): string {
  if (post.intro) {
    return post.intro
  } else if (post.full && post.full.length <= 500) {
    return post.full
  } else {
    return ''
  }
}

export async function calcPostReading(
  post: OriginPost,
  feed?: FeedValue,
  filterId?: string
): Promise<'fast' | 'slow'> {
  let checker = prepareFilters(
    await loadFilters({
      feedId: feed?.id,
      id: filterId
    })
  )
  let action = checker(post)

  if (action) {
    return action === 'fast' ? 'fast' : 'slow'
  }
  if (feed) {
    return feed.reading
  }
  return 'fast'
}

export async function getPostsByFilter(filterId: string): Promise<PostValue[]> {
  let filters = await loadFilters({ id: filterId })

  if (filters.length === 0) return []

  let checker = prepareFilters(filters)
  let filterPosts = await loadPosts()
  filterPosts = filterPosts.filter(post => checker(post))

  return filterPosts
}

export async function changePostsByFeed(feedId: string): Promise<void> {
  let posts = await loadPosts({ feedId })
  let feed = await loadValue(getFeed(feedId))
  for (let post of posts) {
    let reading = await calcPostReading(post, feed)
    await changePost(post.id, { reading })
  }
}

export async function changePostsByFilter(filterId: string): Promise<void> {
  let posts = await getPostsByFilter(filterId)
  let feeds: Record<string, FeedValue | undefined> = {}
  for (let post of posts) {
    if (!feeds[post.feedId]) {
      feeds[post.feedId] = await loadValue(getFeed(post.feedId))
    }
    let reading = await calcPostReading(post, feeds[post.feedId], filterId)
    await changePost(post.id, { reading })
  }
}

export async function clearPostFilter(filterId: string): Promise<void> {
  let filters = await loadFilters({ id: filterId })
  if (!filters[0]) return
  let feedId = filters[0].feedId
  let posts = await loadPosts({ feedId })
  for (let post of posts) {
    let feed = await loadValue(getFeed(feedId))
    let reading = feed?.reading ?? 'fast'
    await changePost(post.id, { reading })
  }
}

let testPostId = 0

export function testPost(feed: Partial<PostValue> = {}): PostValue {
  testPostId += 1
  return {
    feedId: 'feed-1',
    id: `post-${testPostId}`,
    intro: `Post ${testPostId}`,
    media: [],
    originId: `test-${testPostId}`,
    publishedAt: 1000,
    reading: 'fast',
    url: `http://example.com/${testPostId}`,
    ...feed
  }
}
