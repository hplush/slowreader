import {
  changeSyncMapById,
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type FilterStore,
  type LoadedFilterValue,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'

import { getClient } from './client.js'
import type { FeedValue } from './feed.js'

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

export const GENERAL_CATEGORY: CategoryValue = {
  id: 'general',
  title: ''
}

export const BROKEN_CATEGORY: CategoryValue = {
  id: 'broken',
  title: ''
}

export function feedsByCategory(
  categories: LoadedFilterValue<CategoryValue>,
  feeds: readonly FeedValue[]
): [CategoryValue, FeedValue[]][] {
  let allCategories = categories.list.sort((a, b) => {
    return a.title.localeCompare(b.title)
  })

  let general: FeedValue[] = []
  let broken: FeedValue[] = []

  let byId: Record<string, FeedValue[]> = {
    general: []
  }
  for (let category of allCategories) {
    byId[category.id] = []
  }

  for (let feed of feeds) {
    if (feed.categoryId === 'general') {
      general.push(feed)
    } else if (categories.list.some(i => i.id === feed.categoryId)) {
      byId[feed.categoryId]!.push(feed)
    } else {
      broken.push(feed)
    }
  }

  let result: [CategoryValue, FeedValue[]][] = allCategories.map(category => {
    return [category, byId[category.id]!]
  })
  if (general.length > 0) {
    result.unshift([GENERAL_CATEGORY, general])
  }
  if (broken.length > 0) {
    result.push([BROKEN_CATEGORY, broken])
  }

  for (let i of result) {
    i[1] = i[1].sort((a, b) => a.title.localeCompare(b.title))
  }

  return result
}
