import { loadValue } from '@logux/client'
import { atom, onMount } from 'nanostores'

import {
  type CategoryValue,
  feedCategory,
  GENERAL_CATEGORY,
  getCategories
} from './category.js'
import { client } from './client.js'
import { getFeed, getFeeds } from './feed.js'
import { getFilters } from './filter.js'
import { loadList } from './utils/stores.js'

function notEmpty<Value>(array: Value[]): array is [Value, ...Value[]] {
  return array.length > 0
}

async function findFastCategories(): Promise<
  [CategoryValue, ...CategoryValue[]]
> {
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

  if (notEmpty(list)) {
    return list
  } else {
    return [GENERAL_CATEGORY]
  }
}

export type FastCategoriesValue =
  | { categories: [CategoryValue, ...CategoryValue[]]; isLoading: false }
  | { isLoading: true }

export const fastCategories = atom<FastCategoriesValue>({ isLoading: true })

onMount(fastCategories, () => {
  fastCategories.set({ isLoading: true })

  let unbindLog: (() => void) | undefined
  let unbindClient = client.subscribe(loguxClient => {
    unbindLog?.()
    unbindLog = undefined

    if (loguxClient) {
      findFastCategories().then(categories => {
        fastCategories.set({ categories, isLoading: false })
      })

      unbindLog = loguxClient.log.on('add', () => {
        findFastCategories().then(categories => {
          fastCategories.set({ categories, isLoading: false })
        })
      })
    }
  })

  return () => {
    unbindLog?.()
    unbindClient()
  }
})
