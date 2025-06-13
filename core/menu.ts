import { ensureLoaded, loadValue } from '@logux/client'
import { persistentAtom } from '@nanostores/persistent'
import { atom, keepMount } from 'nanostores'

import { busyDuring } from './busy.ts'
import {
  type CategoryValue,
  getBrokenCategory,
  getCategories,
  getGeneralCategory
} from './category.ts'
import { BROKEN_FEED, type FeedValue, getFeeds } from './feed.ts'
import { getFilters } from './filter.ts'
import { onLogAction, onMountAny, waitLoading } from './lib/stores.ts'
import { getPosts } from './post.ts'
import { onNextRoute, router } from './router.ts'

export const isMenuOpened = atom<boolean>(false)

export function openMenu(): void {
  onNextRoute(() => {
    if (router.get().route === 'fast') {
      isMenuOpened.set(fastMenu.get().length > 1)
    } else {
      isMenuOpened.set(true)
    }
  })
}

export function closeMenu(): void {
  isMenuOpened.set(false)
}

export type SlowMenu = [CategoryValue, [FeedValue, number][]][]

export let fastMenu = atom<CategoryValue[]>([])
export let slowMenu = atom<SlowMenu>([])
export let menuLoading = atom<boolean>(true)

/**
 * Rebuilds the menu state by categorizing feeds and posts into fast/slow menus
 * with unread counts and proper category organization
 */
async function rebuild(): Promise<void> {
  let [posts, feeds, categories, fastFilters] = await Promise.all([
    loadValue(getPosts()),
    loadValue(getFeeds()),
    loadValue(getCategories()),
    loadValue(getFilters({ action: 'fast' }))
  ])

  let slowPosts = posts.list.filter(i => i.reading === 'slow')
  let fastPosts = posts.list.filter(i => i.reading === 'fast')
  let fastFeeds = feeds.list.filter(i => i.reading === 'fast')

  let feedsWithFastFilters = fastFilters.list.map(i => {
    return feeds.stores.get(i.feedId)!.get()
  })
  let missedFastFeed = fastPosts
    .map(i => i.feedId)
    .filter(feedId => {
      return (
        !fastFeeds.some(i => i.id === feedId) &&
        !feedsWithFastFilters.some(i => i.id === feedId)
      )
    })
    .map(id => feeds.stores.get(id)?.get())

  let uniqueFastCategories: Record<string, CategoryValue> = {}
  for (let feed of [...fastFeeds, ...feedsWithFastFilters, ...missedFastFeed]) {
    if (!feed) continue
    let id = ensureLoaded(feed).categoryId
    if (!uniqueFastCategories[id]) {
      if (id === 'general') {
        uniqueFastCategories[id] = getGeneralCategory()
      } else {
        uniqueFastCategories[id] =
          categories.list.find(i => i.id === id) ?? getBrokenCategory()
      }
    }
  }

  let fast = Object.values(uniqueFastCategories).sort((a, b) => {
    return a.title.localeCompare(b.title)
  })

  if (fast.length > 0) {
    fastMenu.set(fast)
  } else {
    fastMenu.set([getGeneralCategory()])
  }

  let byCategory: Record<string, [FeedValue, number][]> = {}
  let general = false
  let broken = false

  let unreadByFeed: Record<string, number> = {}
  for (let post of slowPosts) {
    unreadByFeed[post.feedId] = (unreadByFeed[post.feedId] ?? 0) + 1
  }
  for (let [feedId, unread] of Object.entries(unreadByFeed)) {
    let feedStore = feeds.stores.get(feedId)
    let feed = feedStore ? ensureLoaded(feedStore.get()) : BROKEN_FEED
    let category = feed.categoryId
    if (category === 'general') {
      general = true
    } else if (!categories.stores.has(category)) {
      category = 'broken'
      broken = true
    }
    if (!byCategory[category]) byCategory[category] = []
    byCategory[category]!.push([feed, unread])
  }

  let allCategories = [...categories.list] as CategoryValue[]
  if (general) allCategories.push(getGeneralCategory())
  if (broken) allCategories.push(getBrokenCategory())
  let categoriesByName = allCategories.sort((a, b) => {
    return a.title.localeCompare(b.title)
  })

  let result: SlowMenu = []
  for (let category of categoriesByName) {
    let list = byCategory[category.id]
    if (list) {
      result.push([category, list])
    }
  }

  slowMenu.set(result)
}

onMountAny([fastMenu, slowMenu], () => {
  menuLoading.set(true)

  rebuild().then(() => {
    menuLoading.set(false)
  })
  let unbindAction = onLogAction(action => {
    if (
      action.type.startsWith('categories/') ||
      action.type.startsWith('feeds/') ||
      action.type.startsWith('posts/') ||
      action.type.startsWith('filters/')
    ) {
      rebuild()
    }
  })

  return () => {
    unbindAction()
    fastMenu.set([])
    slowMenu.set([])
    menuLoading.set(true)
  }
})

export const closedCategories = persistentAtom<Set<string>>(
  'slowreader:closed',
  new Set(),
  {
    decode: str => new Set(str.split(' ')),
    encode: set => Array.from(set).join(' ')
  }
)

export function toggleCategory(id: string): void {
  let clone = new Set([...closedCategories.get()])
  if (clone.has(id)) {
    clone.delete(id)
  } else {
    clone.add(id)
  }
  closedCategories.set(clone)
}

export function busyUntilMenuLoader(): Promise<void> {
  keepMount(fastMenu)
  keepMount(slowMenu)
  return busyDuring(() => waitLoading(menuLoading))
}
