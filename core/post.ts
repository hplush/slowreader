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

import { getClient } from './client.ts'
import { getFeed } from './feed.ts'
import { loadFilters } from './filter.ts'
import type { OptionalId } from './lib/stores.ts'

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

export function getPost(postId: string): SyncMapStore<PostValue> {
  return Post(postId, getClient())
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
  } else if (post.full && post.full.length <= 2000) {
    return post.full
  } else {
    return ''
  }
}

export async function recalcPostsReading(feedId: string): Promise<void> {
  let feed = await loadValue(getFeed(feedId))
  if (!feed) return

  let [filters, posts] = await Promise.all([
    loadFilters({ feedId }),
    loadValue(getPosts({ feedId }))
  ])

  for (let post of posts.list) {
    let reading = filters(post) ?? feed.reading
    if (reading !== 'delete') {
      await changePost(post.id, { reading })
    }
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
