import type { SyncMapValue } from '@logux/client'
import { atom, onMount } from 'nanostores'

import {
  BROKEN_CATEGORY,
  type CategoryValue,
  GENERAL_CATEGORY,
  loadCategories
} from './category.js'
import { client } from './client.js'
import { onEnvironment } from './environment.js'
import { BROKEN_FEED, type FeedValue, loadFeed, loadFeeds } from './feed.js'
import { listenMany, readonlyExport } from './lib/stores.js'
import { getPost, getPosts, loadPosts, type PostValue } from './post.js'
import { type Route, router } from './router.js'

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

export type SlowFeedsValue =
  | { feeds: FeedValue[]; isLoading: false }
  | { isLoading: true }

let $slowFeeds = atom<SlowFeedsValue>({ isLoading: true })

export const slowFeeds = readonlyExport($slowFeeds)

let POSTS_PER_PAGE = 50

export function setSlowPostsPerPage(value: number): void {
  POSTS_PER_PAGE = value
}

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

  let [feedPosts, feeds] = await Promise.all([
    loadPosts({ feedId, reading: 'slow' }),
    loadFeeds({ reading: 'slow' })
  ])
  let sorted = feedPosts.sort((a, b) => b.publishedAt - a.publishedAt)
  let fromIndex = (page - 1) * POSTS_PER_PAGE
  let posts = sorted.slice(fromIndex, fromIndex + POSTS_PER_PAGE)

  $posts.set({ isLoading: false, list: posts })
  $slowFeeds.set({ feeds, isLoading: false })
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
          route: 'slow'
        })
      }
    }),
    router.listen(page => {
      if (notSynced(page) && page.params.feed) {
        loadSlowPosts(page.params.feed, page.params.page)
      }
      if (page.route === 'slow') {
        if (page.params.feed) {
          if ($currentFeed.get() !== page.params.feed) {
            postsUnbind?.()
            postsUnbind = getPosts({ feedId: page.params.feed }).subscribe(
              posts => {
                if (posts.isLoading) {
                  $posts.set({ isLoading: true })
                } else {
                  $posts.set({ isLoading: false, list: posts.list })
                }
              }
            )
          }
        } else {
          postsUnbind?.()
          postsUnbind = undefined
          $posts.set({
            isLoading: false,
            list: []
          })
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
