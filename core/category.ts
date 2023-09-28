import {
  changeSyncMapById,
  createFilter,
  createSyncMap,
  deleteSyncMapById,
  type FilterStore,
  syncMapTemplate
} from '@logux/client'
import { nanoid } from 'nanoid'

import { getClient } from './client.js'

export type CategoryValue = {
  title: string
}

export const Category = syncMapTemplate<CategoryValue>('categories', {
  offline: true,
  remote: false
})

export function getCategories(): FilterStore<CategoryValue> {
  return createFilter(getClient(), Category)
}

export async function addCategory(fields: CategoryValue): Promise<string> {
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
