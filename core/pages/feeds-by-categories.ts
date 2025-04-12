import { atom, effect } from 'nanostores'

import {
  feedsByCategory,
  type FeedsByCategory,
  getCategories
} from '../category.ts'
import { getFeeds } from '../feed.ts'
import { createPage } from './common.ts'

export const feedsByCategoriesPage = createPage('feedsByCategories', () => {
  let $categories = getCategories()
  let $feeds = getFeeds()

  let $groups = atom<FeedsByCategory>([])
  let $loading = atom(true)
  let unbind = effect([$categories, $feeds], (categories, feeds) => {
    if (!categories.isLoading && !feeds.isLoading) {
      $groups.set(feedsByCategory(categories.list, feeds.list))
      $loading.set(false)
    } else {
      $loading.set(true)
    }
  })

  return {
    exit() {
      unbind()
    },
    groups: $groups,
    loading: $loading,
    params: {}
  }
})

export type FeedsByCategoriesPage = ReturnType<typeof feedsByCategoriesPage>
