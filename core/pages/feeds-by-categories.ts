import { atom, computed } from 'nanostores'

import {
  feedsByCategory,
  type FeedsByCategory,
  getCategories
} from '../category.ts'
import { getFeeds } from '../feed.ts'
import { createPage } from './common.ts'

export const feedsByCategories = createPage('feedsByCategories', () => {
  let $categories = getCategories()
  let $feeds = getFeeds()

  let $groups = atom<FeedsByCategory>([])
  let $loading = computed([$categories, $feeds], (categories, feeds) => {
    if (!categories.isLoading && !feeds.isLoading) {
      $groups.set(feedsByCategory(categories.list, feeds.list))
      return false
    } else {
      /* c8 ignore next 2 */
      return true
    }
  })

  return {
    exit() {},
    groups: $groups,
    loading: $loading,
    params: {}
  }
})

export type FeedsByCategoriesPage = ReturnType<typeof feedsByCategories>
