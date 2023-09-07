import { map, type ReadableAtom, type StoreValue } from 'nanostores'

import type { OriginPost } from './post.js'

export interface PostsPageValue {
  hasNext: boolean
  isLoading: boolean
  list: OriginPost[]
}

export type PostsPage = ReadableAtom<PostsPageValue> & {
  nextPage(): Promise<void>
}

export interface PostsPageLoader {
  (): Promise<[OriginPost[], PostsPageLoader | undefined]>
}

interface CreatePostsPage {
  (posts: OriginPost[], loadNext: PostsPageLoader | undefined): PostsPage
  (posts: undefined, loadNext: PostsPageLoader): PostsPage
}

export const postsPage: CreatePostsPage = (posts, loadNext) => {
  let $store = map<StoreValue<PostsPage>>({
    hasNext: true,
    isLoading: true,
    list: []
  })

  let loading = false
  async function nextPage(): Promise<void> {
    if (loadNext && !loading) {
      loading = true
      $store.setKey('isLoading', true)
      let [nextPosts, next] = await loadNext()
      loadNext = next
      loading = false
      $store.set({
        hasNext: !!next,
        isLoading: false,
        list: $store.get().list.concat(nextPosts)
      })
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

  return { ...$store, nextPage }
}
