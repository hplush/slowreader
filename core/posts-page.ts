import { map, type ReadableAtom, type StoreValue } from 'nanostores'

import type { OriginPost } from './post.js'

export interface PostsPageValue {
  hasNext: boolean
  isLoading: boolean
  list: OriginPost[]
}

export type PostsPage = ReadableAtom<PostsPageValue> & {
  loading: Promise<void>
  nextPage(): Promise<void>
}

export interface PostsPageLoader {
  (): Promise<[OriginPost[], PostsPageLoader | undefined]>
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
  let $store = { ...$map, loading: Promise.resolve(), nextPage }

  let isLoading = false
  async function nextPage(): Promise<void> {
    if (loadNext && !isLoading) {
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
      })
      await $store.loading
    }
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
