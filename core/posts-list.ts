import { map, type ReadableAtom, type StoreValue } from 'nanostores'

import type { OriginPost } from './post.ts'

export interface PostsListValue {
  error: Error | undefined
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

export interface PostsListSyncLoader {
  (): PostsListResult
}

/**
 * Feed’s posts. Abstraction to hide complexity with pagination.
 */
export function createPostsList(
  load: PostsListLoader | PostsListSyncLoader | undefined
): PostsList {
  let $map = map<StoreValue<PostsList>>({
    error: undefined,
    hasNext: true,
    isLoading: true,
    list: []
  })
  let $store = {
    ...$map,
    loading: Promise.resolve([]) as PostsList['loading'],
    next
  }

  let loadNext: PostsListLoader | undefined

  function handleLoading(promise: Promise<PostsListResult>): void {
    $store.loading = promise
      .then(([nextPosts, nextLoader]) => {
        loadNext = nextLoader
        $store.set({
          error: undefined,
          hasNext: !!nextLoader,
          isLoading: false,
          list: $store.get().list.concat(nextPosts)
        })
        return nextPosts
      })
      .catch((e: unknown) => {
        if (e instanceof Error) {
          $store.set({
            error: e,
            hasNext: true,
            isLoading: false,
            list: $store.get().list
          })
        }
        return []
      })
  }

  if (load) {
    try {
      let result = load()
      if ('then' in result) {
        handleLoading(result)
      } else {
        loadNext = result[1]
        $store.set({
          error: undefined,
          hasNext: !!loadNext,
          isLoading: false,
          list: result[0]
        })
      }
      /* node:coverage ignore next 3 */
    } catch (e) {
      if (e instanceof Error) $store.setKey('error', e)
    }
  } else {
    $store.setKey('isLoading', false)
  }

  async function next(): ReturnType<PostsList['next']> {
    if (!loadNext) return Promise.resolve([])
    if ($store.get().isLoading) return $store.loading
    $store.setKey('isLoading', true)
    handleLoading(loadNext())

    return $store.loading
  }

  return $store
}
