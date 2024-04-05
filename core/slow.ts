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

let $nextSince = atom<number | undefined>(undefined)

export const nextSlowSince = readonlyExport($nextSince)

let $currentSince = atom<number | undefined>(undefined)

export const slowSince = readonlyExport($currentSince)

export type SlowFeedsValue =
  | { feeds: FeedValue[]; isLoading: false }
  | { isLoading: true }

let $slowFeeds = atom<SlowFeedsValue>({ isLoading: true })

export const slowFeeds = readonlyExport($slowFeeds)

let POSTS_PER_PAGE = 2

export function setSlowPostsPerPage(value: number): void {
  POSTS_PER_PAGE = value
}

let $post = atom<SyncMapValue<PostValue> | undefined>()

export const openedSlowPost = readonlyExport($post)

let inSlow = false

let $currentFeed = atom<string | undefined>(undefined)

export const slowFeed = readonlyExport($currentFeed)

export function clearSlow(): void {
  $currentSince.set(undefined)
  $nextSince.set(undefined)
  postsUnbind?.()
  postUnbind?.()
  $currentFeed.set(undefined)
  $post.set(undefined)
  $posts.set({ isLoading: true })
  $post.set(undefined)
  POSTS_PER_PAGE = 50
}

let postsUnbind: (() => void) | undefined
let postUnbind: (() => void) | undefined

async function load(feedId: string, since?: number): Promise<void> {
  $currentSince.set(since)

  let [feedPosts, feeds] = await Promise.all([
    loadPosts({ feedId, reading: 'slow' }),
    loadFeeds({ reading: 'slow' })
  ])
  let sorted = feedPosts.sort((a, b) => b.publishedAt - a.publishedAt)
  let fromIndex = since ? sorted.findIndex(i => i.publishedAt < since) : 0
  let posts = sorted.slice(fromIndex, fromIndex + POSTS_PER_PAGE)
  let lastSince
  if (sorted.length > fromIndex + POSTS_PER_PAGE) {
    lastSince = posts[posts.length - 1]?.publishedAt
  }

  $posts.set({ isLoading: false, list: posts })
  $nextSince.set(lastSince)
  $slowFeeds.set({ feeds, isLoading: false })
}

async function loadSlowPosts(feedId: string, since?: number): Promise<void> {
  $currentFeed.set(feedId)
  $posts.set({ isLoading: true })
  await load(feedId, since)
}

function notSynced(page: Route): page is Route<'slow'> {
  return (
    page.route === 'slow' &&
    (page.params.feed !== $currentFeed.get() ||
      page.params.since !== $currentSince.get())
  )
}

onEnvironment(({ openRoute }) => {
  return [
    listenMany([$currentFeed, $currentSince], (feed, since) => {
      if (notSynced(router.get())) {
        openRoute({
          params: { feed, since },
          route: 'slow'
        })
      }
    }),
    router.listen(page => {
      if (notSynced(page) && page.params.feed) {
        loadSlowPosts(page.params.feed, page.params.since)
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
