import type { SyncMapValue } from '@logux/client'
import { atom, onMount } from 'nanostores'

import {
  BROKEN_CATEGORY,
  type CategoryValue,
  GENERAL_CATEGORY,
  loadCategories
} from './category.ts'
import { client } from './client.ts'
import { onEnvironment } from './environment.ts'
import { BROKEN_FEED, type FeedValue, loadFeed, loadFeeds } from './feed.ts'
import { loadFilters } from './filter.ts'
import { listenMany, readonlyExport } from './lib/stores.ts'
import { deletePost, getPost, loadPosts } from './post.ts'
import type { PostValue } from './post.ts'
import { type Route, router } from './router.ts'

function notEmpty<Value>(array: Value[]): array is [Value, ...Value[]] {
  return array.length > 0
}

async function findFastCategories(): Promise<
  [CategoryValue, ...CategoryValue[]]
> {
  let [fastFeeds, fastFilters, categories, fastPosts] = await Promise.all([
    loadFeeds({ reading: 'fast' }),
    loadFilters({ action: 'fast' }),
    loadCategories(),
    loadPosts({ reading: 'fast' })
  ])
  let filterFeeds = await Promise.all(fastFilters.map(i => loadFeed(i.feedId)))
  let missedFeedIds = fastPosts
    .map(i => i.feedId)
    .filter(feedId => {
      return (
        !fastFeeds.some(i => i.id === feedId) &&
        !filterFeeds.some(i => i && i.id === feedId)
      )
    })
  let missedFeeds = await Promise.all(missedFeedIds.map(id => loadFeed(id)))

  let uniqueCategories: Record<string, CategoryValue> = {}
  for (let feed of [...fastFeeds, ...filterFeeds, ...missedFeeds]) {
    if (!feed) continue
    let id = feed.categoryId
    if (!uniqueCategories[id]) {
      if (id === 'general') {
        uniqueCategories[id] = GENERAL_CATEGORY
      } else {
        uniqueCategories[id] =
          categories.find(i => i.id === id) ?? BROKEN_CATEGORY
      }
    }
  }

  let list = Object.values(uniqueCategories).sort((a, b) => {
    return a.title.localeCompare(b.title)
  })

  if (notEmpty(list)) {
    return list
  } else {
    return [GENERAL_CATEGORY]
  }
}

export type FastCategoriesValue =
  | { categories: [CategoryValue, ...CategoryValue[]]; isLoading: false }
  | { isLoading: true }

let $categories = atom<FastCategoriesValue>({ isLoading: true })

export const fastCategories = readonlyExport($categories)

onMount(fastCategories, () => {
  $categories.set({ isLoading: true })

  let unbindLog: (() => void) | undefined
  let unbindClient = client.subscribe(loguxClient => {
    unbindLog?.()
    unbindLog = undefined

    if (loguxClient) {
      findFastCategories().then(categories => {
        $categories.set({ categories, isLoading: false })
      })

      unbindLog = loguxClient.log.on('add', action => {
        if (
          action.type.startsWith('categories/') ||
          action.type.startsWith('feeds/') ||
          action.type.startsWith('posts/') ||
          action.type.startsWith('filters/')
        ) {
          findFastCategories().then(categories => {
            $categories.set({ categories, isLoading: false })
          })
        }
      })
    }
  })

  return () => {
    unbindLog?.()
    unbindClient()
  }
})

let $loading = atom<'init' | 'next' | false>('init')

export const fastLoading = readonlyExport($loading)

export interface FastEntry {
  feed: FeedValue
  post: PostValue
}

let $posts = atom<FastEntry[]>([])

export const fastPosts = readonlyExport($posts)

let $nextSince = atom<number | undefined>()

export const nextFastSince = readonlyExport($nextSince)

let $reading = atom(0)

export const constantFastReading = readonlyExport($reading)

let $currentSince = atom<number | undefined>(undefined)

export const fastSince = readonlyExport($currentSince)

let $currentCategory = atom<string | undefined>(undefined)

export const fastCategory = readonlyExport($currentCategory)

let POSTS_PER_PAGE = 50

export function setFastPostsPerPage(value: number): void {
  POSTS_PER_PAGE = value
}

async function load(categoryId: string, since?: number): Promise<void> {
  $currentSince.set(since)

  let [allFastPosts, categoryFeeds] = await Promise.all([
    loadPosts({ reading: 'fast' }),
    loadFeeds({ categoryId })
  ])

  let feedIds = new Set(categoryFeeds.map(i => i.id))
  let categoryPosts = allFastPosts.filter(i => feedIds.has(i.feedId))
  let sorted = categoryPosts.sort((a, b) => b.publishedAt - a.publishedAt)
  let fromIndex = since ? sorted.findIndex(i => i.publishedAt < since) : 0
  let posts = sorted.slice(fromIndex, fromIndex + POSTS_PER_PAGE)
  let lastSince
  if (sorted.length > fromIndex + POSTS_PER_PAGE) {
    lastSince = posts[posts.length - 1]?.publishedAt
  }

  let entries = await Promise.all(
    posts.map(async post => {
      return { feed: (await loadFeed(post.feedId)) ?? BROKEN_FEED, post }
    })
  )

  $nextSince.set(lastSince)
  $loading.set(false)
  $posts.set(entries)
}

export async function markReadAndLoadNextFastPosts(): Promise<void> {
  let category = $currentCategory.get()
  if (category) {
    $loading.set('next')
    $reading.set($reading.get() + 1)
    await Promise.all($posts.get().map(({ post }) => deletePost(post.id)))
    if ($nextSince.get()) {
      await load(category, $nextSince.get())
    } else {
      $posts.set([])
      $loading.set(false)
    }
  }
}

async function loadFastPost(categoryId: string, since?: number): Promise<void> {
  $currentCategory.set(categoryId)
  $loading.set('init')
  $reading.set(0)
  await load(categoryId, since)
}

export function clearFast(): void {
  $currentCategory.set(undefined)
  $currentSince.set(undefined)
  $loading.set('init')
  $posts.set([])
  $nextSince.set(undefined)
  $reading.set(0)
  postUnbind?.()
  $post.set(undefined)
  postUnbind = undefined
  POSTS_PER_PAGE = 50
}

let $post = atom<SyncMapValue<PostValue> | undefined>(undefined)

export const openedFastPost = readonlyExport($post)

function notSynced(page: Route): page is Route<'fast'> {
  return (
    page.route === 'fast' &&
    (page.params.category !== $currentCategory.get() ||
      page.params.since !== $currentSince.get())
  )
}

let postUnbind: (() => void) | undefined

let inFast = false

onEnvironment(({ openRoute }) => {
  return [
    listenMany([$currentCategory, $currentSince], (category, since) => {
      if (notSynced(router.get())) {
        openRoute({
          params: { category, since },
          route: 'fast'
        })
      }
    }),
    router.listen(page => {
      if (notSynced(page) && page.params.category) {
        loadFastPost(page.params.category, page.params.since)
      }
      if (page.route === 'fast') {
        if (page.params.post) {
          if ($post.get()?.id !== page.params.post) {
            let store = getPost(page.params.post)
            postUnbind?.()
            postUnbind = store.subscribe(value => {
              $post.set(value)
            })
          }
        } else {
          postUnbind?.()
          postUnbind = undefined
          $post.set(undefined)
        }
        inFast = true
      } else if (inFast) {
        inFast = false
        clearFast()
      }
    })
  ]
})
