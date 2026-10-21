import { withMeta } from '@logux/client/db'
import type { SqlStore, SqlStoreValue } from '@nanostores/sql'
import { atom, computed, type ReadableAtom } from 'nanostores'

import { commonMessages as t } from './messages/index.ts'
import {
  type CategoryChanges,
  type CategoryValue,
  type FeedValue,
  GENERAL_CATEGORY,
  getTables,
  type NewCategory
} from './schema.ts'

export type { CategoryValue, NewCategory }

export type FeedsByCategory = [CategoryValue, FeedValue[]][]

export function getCategory(
  categoryId: string
): ReadableAtom<SqlStoreValue<CategoryValue | undefined>> {
  if (categoryId === GENERAL_CATEGORY) {
    /* node:coverage ignore next 2 */
    return atom({ status: 'ready', value: getGeneralCategory() })
  } else {
    return getTables().categories.row(categoryId)
  }
}

export function getCategories(): SqlStore<CategoryValue[]> {
  return getTables().categories.select`ORDER BY "title"`
}

/**
 * Values for the category select with the option to add a new category.
 * Pass already loaded store to not show the select without categories.
 */
export function getCategoryOptions(
  $categories = getCategories()
): ReadableAtom<[string, string][]> {
  return computed([$categories, t], (categories, messages) => [
    [GENERAL_CATEGORY, messages.generalCategory] as [string, string],
    ...(categories.status === 'ready'
      ? categories.value.map((i): [string, string] => [i.id, i.title])
      : []),
    ['new', messages.addCategory] as [string, string]
  ])
}

export async function loadCategory(
  categoryId: string
): Promise<CategoryValue | undefined> {
  if (categoryId === GENERAL_CATEGORY) return getGeneralCategory()
  return getTables().categories.get(categoryId)
}

export function loadCategories(): Promise<CategoryValue[]> {
  return getTables().categories.load`ORDER BY "title"`
}

export function addCategory(categories: NewCategory[]): Promise<string[]>
export function addCategory(fields: NewCategory): Promise<string>
export function addCategory(
  fields: NewCategory | NewCategory[]
): Promise<string[] | string> {
  return getTables().categories.create(fields)
}

export function changeCategory(
  categoryId: string,
  changes: CategoryChanges
): Promise<void> {
  return getTables().categories.update(categoryId, changes)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await getTables().feeds.updateWhere({ categoryId: GENERAL_CATEGORY })`
    "categoryId" = ${categoryId}
  `
  await getTables().accounts.updateWhere({ categoryId: GENERAL_CATEGORY })`
    "categoryId" = ${categoryId}
  `
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
    [GENERAL_CATEGORY]: []
  }
  for (let category of allCategories) {
    byId[category.id] = []
  }

  for (let feed of feeds) {
    if (feed.categoryId === GENERAL_CATEGORY) {
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
  return withMeta<CategoryValue>({
    fastReader: null,
    id: GENERAL_CATEGORY,
    slowReader: null,
    title: t.value?.generalCategory || 'General'
  })
}
