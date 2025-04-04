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
import { BROKEN_FEED, type FeedValue, loadFeed } from './feed.ts'
import { listenMany, readonlyExport } from './lib/stores.ts'
import { getPost, loadPosts, type PostValue } from './post.ts'
import { type Route, router } from './router.ts'

export type SlowCategoriesTree = [CategoryValue, [FeedValue, number][]][]

export type SlowCategoriesValue =
  | {
      isLoading: false
      tree: SlowCategoriesTree
    }
  | { isLoading: true }

let $categories = atom<SlowCategoriesValue>({ isLoading: true })

async function findSlowCategories(): Promise<SlowCategoriesTree> {
  let [posts, categories] = await Promise.all([
    loadPosts({ reading: 'slow' }),
    loadCategories()
  ])

  let general: [FeedValue, number][] = []
  let byCategory: Record<string, [FeedValue, number][]> = {}
  let broken: [FeedValue, number][] = []

  let postsByFeed: Record<string, number> = {}
  for (let post of posts) {
    postsByFeed[post.feedId] = (postsByFeed[post.feedId] ?? 0) + 1
  }

  await Promise.all(
    Object.entries(postsByFeed).map(async ([feedId, unread]) => {
      let feed = (await loadFeed(feedId)) ?? BROKEN_FEED
      let category = feed.categoryId
      if (feed.categoryId === 'general') {
        general.push([feed, unread])
      }
      if (category === 'general' || categories.find(i => i.id === category)) {
        let list = byCategory[category] ?? (byCategory[category] = [])
        list.push([feed, unread])
      } else {
        broken.push([feed, unread])
      }
    })
  )

  let categoriesByName = categories.sort((a, b) => {
    return a.title.localeCompare(b.title)
  })

  let result: SlowCategoriesTree = []
  if (general.length > 0) {
    result.push([GENERAL_CATEGORY, general])
  }
  for (let category of categoriesByName) {
    let list = byCategory[category.id]
    if (list) {
      result.push([category, list])
    }
  }
  if (broken.length > 0) {
    result.push([BROKEN_CATEGORY, broken])
  }

  return result
}

onMount($categories, () => {
  $categories.set({ isLoading: true })

  let unbindLog: (() => void) | undefined
  let unbindClient = client.subscribe(loguxClient => {
    unbindLog?.()
    unbindLog = undefined

    if (loguxClient) {
      findSlowCategories().then(tree => {
        $categories.set({ isLoading: false, tree })
      })

      unbindLog = loguxClient.log.on('add', action => {
        if (
          action.type.startsWith('categories/') ||
          action.type.startsWith('feeds/') ||
          action.type.startsWith('posts/')
        ) {
          findSlowCategories().then(tree => {
            $categories.set({ isLoading: false, tree })
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

export const slowCategories = readonlyExport($categories)

export type SlowPostsValue =
  | { isLoading: false; list: PostValue[] }
  | { isLoading: true }

let $posts = atom<SlowPostsValue>({ isLoading: true })

export const slowPosts = readonlyExport($posts)

let POSTS_PER_PAGE = 100

let $totalPosts = atom<number>(0)

export const totalSlowPosts = readonlyExport($totalPosts)

let $totalPages = atom<number>(1)

export const totalSlowPages = readonlyExport($totalPages)

let $page = atom<number>(1)

export const slowPage = readonlyExport($page)

let $post = atom<SyncMapValue<PostValue> | undefined>()

export const openedSlowPost = readonlyExport($post)

let inSlow = false

let $currentFeed = atom<string | undefined>(undefined)

export const slowFeed = readonlyExport($currentFeed)

export function clearSlow(): void {
  postsUnbind?.()
  postUnbind?.()
  $currentFeed.set(undefined)
  $post.set(undefined)
  $posts.set({ isLoading: true })
  $post.set(undefined)
  $totalPosts.set(0)
  $totalPages.set(1)
  $page.set(1)
  POSTS_PER_PAGE = 50
}

let postsUnbind: (() => void) | undefined
let postUnbind: (() => void) | undefined

async function load(feedId: string, page: number = 1): Promise<void> {
  $page.set(page)

  let feedPosts = await loadPosts({ feedId, reading: 'slow' })
  let sorted = feedPosts.sort((a, b) => b.publishedAt - a.publishedAt)
  let fromIndex = (page - 1) * POSTS_PER_PAGE
  let posts = sorted.slice(fromIndex, fromIndex + POSTS_PER_PAGE)

  $posts.set({ isLoading: false, list: posts })
  $totalPosts.set(feedPosts.length)
  $totalPages.set(Math.ceil(feedPosts.length / POSTS_PER_PAGE))
}

async function loadSlowPosts(feedId: string, page?: number): Promise<void> {
  $currentFeed.set(feedId)
  $posts.set({ isLoading: true })
  await load(feedId, page)
}

function notSynced(page: Route): page is Route<'slow'> {
  return (
    page.route === 'slow' &&
    (page.params.feed !== $currentFeed.get() ||
      page.params.page !== $page.get())
  )
}

onEnvironment(({ openRoute }) => {
  return [
    listenMany([$currentFeed, $page], (feed, page) => {
      if (notSynced(router.get())) {
        openRoute({
          params: { feed, page },
          popups: [],
          route: 'slow'
        })
      }
    }),
    router.listen(page => {
      if (page.route === 'slow') {
        if (page.params.feed) {
          if (notSynced(page)) {
            loadSlowPosts(page.params.feed, page.params.page)
          }
        } else {
          $currentFeed.set(undefined)
          $posts.set({ isLoading: false, list: [] })
        }
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
        inSlow = true
      } else if (inSlow) {
        inSlow = false
        clearSlow()
      }
    })
  ]
})
