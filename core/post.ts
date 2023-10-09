import {
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type Filter,
  type FilterStore,
  type SyncMapStore,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'

import { getClient } from './client.js'

export type OriginPost = {
  full?: string
  intro?: string
  media: string[]
  originId: string
  publishedAt?: number
  title?: string
  url?: string
}

export type PostValue = OriginPost & {
  feedId: string
  id: string
  reading: 'fast' | 'slow'
}

export const Post = syncMapTemplate<PostValue>('posts', {
  offline: true,
  remote: false
})

export async function addPost(fields: Omit<PostValue, 'id'>): Promise<string> {
  let id = nanoid()
  await createSyncMap(getClient(), Post, { id, ...fields })
  return id
}

export function getPosts(
  filter: Filter<PostValue> = {}
): FilterStore<PostValue> {
  return createFilter(getClient(), Post, filter)
}

export function getPost(feedId: string): SyncMapStore<PostValue> {
  return Post(feedId, getClient())
}

export function deletePost(postId: string): Promise<void> {
  return deleteSyncMapById(getClient(), Post, postId)
}
