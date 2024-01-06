import {
  changeSyncMapById,
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type FilterStore,
  type LoadedFilterValue,
  loadValue,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'
import { atom, onMount } from 'nanostores'

import { getClient } from './client.js'
import { type FeedValue, getFeed, getFeeds } from './feed.js'
import { getFilters } from './filter.js'
import { loadList } from './utils/stores.js'

export type CategoryValue = {
  id: string
  title: string
}

export const Category = syncMapTemplate<CategoryValue>('categories', {
  offline: true,
  remote: false
})

export function getCategories(): FilterStore<CategoryValue> {
  return createFilter(getClient(), Category)
}

export async function addCategory(
  fields: Omit<CategoryValue, 'id'>
): Promise<string> {
  let id = nanoid()
  await createSyncMap(getClient(), Category, { id, ...fields })
  return id
}

export async function changeCategory(
  categoryId: string,
  changes: Partial<CategoryValue>
): Promise<void> {
  return changeSyncMapById(getClient(), Category, categoryId, changes)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  return deleteSyncMapById(getClient(), Category, categoryId)
}

export function feedCategory(
  categoryId: string | undefined,
  categories: LoadedFilterValue<CategoryValue>
): string {
  if (typeof categoryId === 'undefined') {
    return 'general'
  } else if (categories.list.some(i => i.id === categoryId)) {
    return categoryId
  } else {
    return 'general'
  }
}

const GENERAL_CATEGORY: CategoryValue = {
  id: 'general',
  title: ''
}

export function feedsByCategory(
  categories: LoadedFilterValue<CategoryValue>,
  feeds: readonly FeedValue[]
): [CategoryValue, FeedValue[]][] {
  let allCategories = [
    GENERAL_CATEGORY,
    ...categories.list.sort((a, b) => a.title.localeCompare(b.title))
  ]
  let byId: Record<string, FeedValue[]> = {
    general: []
  }
  for (let category of allCategories) {
    byId[category.id] = []
  }
  for (let feed of feeds) {
    byId[feedCategory(feed.categoryId, categories)]!.push(feed)
  }
  return allCategories.map(category => {
    return [category, byId[category.id]!]
  })
}

async function findFastCategories(): Promise<CategoryValue[]> {
  let [fastFeeds, fastFilters, categories] = await Promise.all([
    loadList(getFeeds({ reading: 'fast' })),
    loadList(getFilters({ action: 'fast' })),
    loadValue(getCategories())
  ])
  let filterFeeds = await Promise.all(
    fastFilters.map(i => loadValue(getFeed(i.feedId)))
  )
  let uniqueCategories: Record<string, CategoryValue> = {}
  for (let feed of [...fastFeeds, ...filterFeeds]) {
    let id = feedCategory(feed.categoryId, categories)
    if (!uniqueCategories[id]) {
      if (id === 'general') {
        uniqueCategories[id] = GENERAL_CATEGORY
      } else {
        uniqueCategories[id] = categories.list.find(i => i.id === id)!
      }
    }
  }

  let list = Object.values(uniqueCategories).sort((a, b) => {
    return a.title.localeCompare(b.title)
  })

  if (list.length > 0) {
    return list
  } else {
    return [GENERAL_CATEGORY]
  }
}

export type FastCategoriesValue =
  | { categories: CategoryValue[]; isLoading: false }
  | { isLoading: true }

export const fastCategories = atom<FastCategoriesValue>({ isLoading: true })

onMount(fastCategories, () => {
  fastCategories.set({ isLoading: true })
  findFastCategories().then(categories => {
    fastCategories.set({ categories, isLoading: false })
  })
  return getClient().log.on('add', () => {
    findFastCategories().then(categories => {
      fastCategories.set({ categories, isLoading: false })
    })
  })
})
