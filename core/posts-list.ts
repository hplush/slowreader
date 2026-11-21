import { nanoid } from 'nanoid'
import { map, type ReadableAtom, type StoreValue } from 'nanostores'

import type { OriginPost, ParsedPost } from './post.ts'

export interface PostsListValue {
  error: Error | undefined
  hasNext: boolean
  isLoading: boolean
  list: OriginPost[]
  unchanged: boolean
}

export type PostsList = {
  loading: Promise<OriginPost[]>
  /**
   * Add the next page to the end of `list`. Returns only the new posts.
   */
  next(): Promise<OriginPost[]>
} & ReadableAtom<PostsListValue>

export type PostsListResult = [ParsedPost[], PostsListLoader | undefined]

export type FirstPageResult = 'unchanged' | PostsListResult

export interface PostsListLoader {
  (): Promise<PostsListResult>
}

export interface FirstPageLoader {
  (): FirstPageResult | Promise<FirstPageResult>
}

function addIds(posts: ParsedPost[]): OriginPost[] {
  return posts.map(post => ({ ...post, id: nanoid() }))
}

/**
 * Feed’s posts. Abstraction to hide complexity with pagination.
 */
export function createPostsList(load: FirstPageLoader): PostsList {
  let $map = map<StoreValue<PostsList>>({
    error: undefined,
    hasNext: true,
    isLoading: true,
    list: [],
    unchanged: false
  })
  let $store = {
    ...$map,
    loading: Promise.resolve([]) as PostsList['loading'],
    next
  }

  let loadNext: PostsListLoader | undefined

  function addPage(result: FirstPageResult): OriginPost[] {
    if (result === 'unchanged') {
      $store.set({
        error: undefined,
        hasNext: false,
        isLoading: false,
        list: [],
        unchanged: true
      })
      return []
    }
    let posts = addIds(result[0])
    loadNext = result[1]
    $store.set({
      error: undefined,
      hasNext: !!loadNext,
      isLoading: false,
      list: [...$store.get().list, ...posts],
      unchanged: false
    })
    return posts
  }

  function handleLoading(promise: Promise<FirstPageResult>): void {
    $store.loading = promise.then(addPage).catch((e: unknown) => {
      if (e instanceof Error) {
        $store.set({
          error: e,
          hasNext: false,
          isLoading: false,
          list: $store.get().list,
          unchanged: false
        })
      }
      return []
    })
  }

  try {
    let result = load()
    if (result instanceof Promise) {
      handleLoading(result)
    } else {
      addPage(result)
    }
    /* node:coverage ignore next 3 */
  } catch (e) {
    if (e instanceof Error) $store.setKey('error', e)
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

function getPostDates(posts: PostsList): number[] {
  return posts.get().list.flatMap(post => {
    let date = post.sortedAt ?? post.publishedAt
    return !post.selfReplyTo && date ? [date] : []
  })
}

function countPostsPerDay(dates: number[]): number {
  let now = Date.now() / 1000
  let recent = dates.filter(date => now - date < 365 * 86400)
  // A single post an hour ago does not mean 24 posts per day
  let days = Math.min(365, Math.max(1, (now - Math.min(...dates)) / 86400))
  return Number((recent.length / days).toPrecision(2))
}

/**
 * Posts per day in the last year. Thread parts are shown inside the card
 * of the thread’s first post, so they are not counted. Loaders already skip
 * replies to others.
 */
export function getPostsFrequency(posts: PostsList): number | undefined {
  let dates = getPostDates(posts)
  if (dates.length === 0) return undefined
  return countPostsPerDay(dates)
}

export type PostsActivity =
  | {
      lastPostAt: number
      dead: true
      silence: 'halfYear' | 'twoYears' | 'year'
    }
  | { frequency: number; dead: false }

export function getPostsActivity(posts: PostsList): PostsActivity | undefined {
  let dates = getPostDates(posts)
  if (dates.length === 0) return undefined
  let lastPostAt = Math.max(...dates)
  let days = (Date.now() / 1000 - lastPostAt) / 86400
  if (days > 730) return { lastPostAt, dead: true, silence: 'twoYears' }
  if (days > 365) return { lastPostAt, dead: true, silence: 'year' }
  if (days > 182) return { lastPostAt, dead: true, silence: 'halfYear' }
  return { frequency: countPostsPerDay(dates), dead: false }
}

export function isTooFrequent(perDay: number): boolean {
  return perDay > 10
}
