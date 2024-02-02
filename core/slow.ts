import { atom, onMount } from 'nanostores'

import {
  BROKEN_CATEGORY,
  type CategoryValue,
  GENERAL_CATEGORY,
  loadCategories
} from './category.js'
import { client } from './client.js'
import { BROKEN_FEED, type FeedValue, loadFeed } from './feed.js'
import { loadPosts } from './post.js'
import { readonlyExport } from './utils/stores.js'

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
