import type { SqlStore } from '@nanostores/sql'
import { atom, type ReadableAtom } from 'nanostores'

import { changeFeed, loadFeedsByCategory } from './feed.ts'
import { firstRow } from './lib/stores.ts'
import { commonMessages as t } from './messages/index.ts'
import {
  type CategoryChanges,
  type CategoryValue,
  createRow,
  type FeedValue,
  getTables,
  type NewCategory,
  select
} from './schema.ts'

export type { CategoryValue, NewCategory }

export type FeedsByCategory = [CategoryValue, FeedValue[]][]

export function getCategory(
  categoryId: string
): ReadableAtom<CategoryValue | undefined> {
  if (categoryId === 'general') {
    /* node:coverage ignore next 2 */
    return atom(getGeneralCategory())
  } else {
    return firstRow(getTables().categories.select`WHERE "id" = ${categoryId}`)
  }
}

export function getCategories(): SqlStore<CategoryValue[]> {
  return getTables().categories.select`ORDER BY "title"`
}

export async function loadCategory(
  categoryId: string
): Promise<CategoryValue | undefined> {
  if (categoryId === 'general') return getGeneralCategory()
  let rows = await select<CategoryValue>`
    SELECT * FROM "categories" WHERE "id" = ${categoryId}
  `
  return rows[0]
}

export function loadCategories(): Promise<CategoryValue[]> {
  return select<CategoryValue>`SELECT * FROM "categories" ORDER BY "title"`
}

export function addCategory(fields: NewCategory): Promise<string> {
  return createRow(getTables().categories, fields)
}

export function changeCategory(
  categoryId: string,
  changes: CategoryChanges
): Promise<void> {
  return getTables().categories.update(categoryId, changes)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  let feeds = await loadFeedsByCategory(categoryId)
  await Promise.all(
    feeds.map(feed => changeFeed(feed.id, { categoryId: 'general' }))
  )
  return getTables().categories.delete(categoryId)
}

export function feedsByCategory(
  categories: CategoryValue[],
  feeds: FeedValue[]
): FeedsByCategory {
  let allCategories = categories.toSorted((a, b) => {
    return a.title.localeCompare(b.title)
  })

  let general: FeedValue[] = []

  let byId: Record<string, FeedValue[]> = {
    general: []
  }
  for (let category of allCategories) {
    byId[category.id] = []
  }

  for (let feed of feeds) {
    if (feed.categoryId === 'general') {
      general.push(feed)
    } else if (categories.some(i => i.id === feed.categoryId)) {
      byId[feed.categoryId]!.push(feed)
    }
  }

  let result: [CategoryValue, FeedValue[]][] = allCategories.map(category => {
    return [category, byId[category.id]!]
  })
  if (general.length > 0) {
    result.unshift([getGeneralCategory(), general])
  }

  for (let i of result) {
    i[1].sort((a, b) => a.title.localeCompare(b.title))
  }

  return result
}

export function getGeneralCategory(): CategoryValue {
  return {
    fastReader: null,
    id: 'general',
    slowReader: null,
    title: t.value?.generalCategory || 'General',
    updatedAt: '{}'
  }
}
