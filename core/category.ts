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

export function feedsByCategory(
  categories: LoadedFilterValue<CategoryValue>,
  feeds: readonly FeedValue[]
): [CategoryValue, FeedValue[]][] {
  let allCategories: CategoryValue[] = [
    {
      id: 'general',
      title: 'General'
    } satisfies CategoryValue
  ].concat(...categories.list.sort((a, b) => a.title.localeCompare(b.title)))
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
