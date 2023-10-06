import { map, type ReadableAtom, type StoreValue } from 'nanostores'

import type { OriginPost } from './post.js'

export interface PostsPageValue {
  hasNext: boolean
  isLoading: boolean
  list: OriginPost[]
}

export type PostsPage = ReadableAtom<PostsPageValue> & {
  loading: Promise<OriginPost[]>
  nextPage(): Promise<OriginPost[]>
}

export type PostsPageResult = [OriginPost[], PostsPageLoader | undefined]

export interface PostsPageLoader {
  (): Promise<PostsPageResult>
}

interface CreatePostsPage {
  (posts: OriginPost[], loadNext: PostsPageLoader | undefined): PostsPage
  (posts: undefined, loadNext: PostsPageLoader): PostsPage
}

export const createPostsPage: CreatePostsPage = (posts, loadNext) => {
  let $map = map<StoreValue<PostsPage>>({
    hasNext: true,
    isLoading: true,
    list: []
  })
  let $store = {
    ...$map,
    loading: Promise.resolve([]) as PostsPage['loading'],
    nextPage
  }

  let isLoading = false
  async function nextPage(): ReturnType<PostsPage['nextPage']> {
    if (!loadNext) return Promise.resolve([])
    if (isLoading) return $store.loading
    isLoading = true
    $store.setKey('isLoading', true)
    $store.loading = loadNext().then(([nextPosts, next]) => {
      loadNext = next
      isLoading = false
      $store.set({
        hasNext: !!next,
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
    nextPage()
  }

  return $store
}
