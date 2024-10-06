import { map, type ReadableAtom, type StoreValue } from 'nanostores'

import type { OriginPost } from './post.ts'

export interface PostsListValue {
  hasNext: boolean
  isLoading: boolean
  list: OriginPost[]
}

export type PostsList = {
  loading: Promise<OriginPost[]>
  next(): Promise<OriginPost[]>
} & ReadableAtom<PostsListValue>

export type PostsListResult = [OriginPost[], PostsListLoader | undefined]

export interface PostsListLoader {
  (): Promise<PostsListResult>
}

interface CreatePostsList {
  (posts: OriginPost[], loadNext: PostsListLoader | undefined): PostsList
  (posts: undefined, loadNext: PostsListLoader): PostsList
}

export const createPostsList: CreatePostsList = (posts, loadNext) => {
  let $map = map<StoreValue<PostsList>>({
    hasNext: true,
    isLoading: true,
    list: []
  })
  let $store = {
    ...$map,
    loading: Promise.resolve([]) as PostsList['loading'],
    next
  }

  let isLoading = false
  async function next(): ReturnType<PostsList['next']> {
    if (!loadNext) return Promise.resolve([])
    if (isLoading) return $store.loading
    isLoading = true
    $store.setKey('isLoading', true)
    $store.loading = loadNext().then(([nextPosts, nextLoader]) => {
      loadNext = nextLoader
      isLoading = false
      $store.set({
        hasNext: !!nextLoader,
        isLoading: false,
        list: $store.get().list.concat(nextPosts)
      })
      return nextPosts
    })
    return $store.loading
  }

  if (posts) {
    $store.set({
      hasNext: !!loadNext,
      isLoading: false,
      list: posts
    })
  } else {
    next().catch(() => {
      isLoading = false
    })
  }

  return $store
}
