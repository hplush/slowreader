import { atom, computed, effect } from 'nanostores'

import { getAccounts } from '../account.ts'
import {
  feedsByCategory,
  type FeedsByCategory,
  getCategories
} from '../category.ts'
import { getFeedReadings, getFeeds } from '../feed.ts'
import { getFeedStats } from '../reactions.ts'
import { navigate } from '../router.ts'
import type { PostValue } from '../schema.ts'
import { createPage, routeParam } from './common.ts'
import { injectFollowsSync } from './mixins/follows-sync.ts'
import { injectOpenedFeed } from './mixins/opened-feed.ts'

export const categoriesPage = createPage('categories', () => {
  let openedFeedMixin = injectOpenedFeed()

  let $accounts = getAccounts()
  let $categories = getCategories()
  let $feeds = getFeeds()
  let followsSyncMixin = injectFollowsSync()

  let $open = routeParam('categories', 'open')
  let $expanded = atom(new Set<string>())
  let $groups = atom<FeedsByCategory>([])
  let $readings = atom<Record<string, PostValue['reading']>>({})
  let $loading = atom(true)
  let $scrollTarget = atom<string | undefined>()

  let unbind = effect(
    [$categories, $feeds, $accounts, followsSyncMixin.sync],
    (categories, feeds, accounts, sync) => {
      if (
        categories.status === 'ready' &&
        feeds.status === 'ready' &&
        accounts.status === 'ready' &&
        sync !== 'checking'
      ) {
        $groups.set(
          feedsByCategory(categories.value, feeds.value, accounts.value)
        )
        $readings.set(getFeedReadings(feeds.value, accounts.value))
        $loading.set(false)
      } else {
        $loading.set(true)
      }
    }
  )

  function expand(categoryId: string): void {
    $expanded.set(new Set($expanded.get()).add(categoryId))
  }

  let unbindOpen = $open.subscribe(categoryId => {
    if (categoryId) {
      expand(categoryId)
      $scrollTarget.set(categoryId)
      navigate(route => ({ ...route, params: {} }), true)
    }
  })

  return {
    ...openedFeedMixin,
    exit() {
      unbind()
      unbindOpen()
    },
    expand,
    expanded: $expanded,
    groups: $groups,
    loading: $loading,
    params: { open: $open },
    readings: $readings,
    scrolled() {
      $scrollTarget.set(undefined)
    },
    scrollTarget: $scrollTarget,
    // User can have 10K feeds, so only opened categories are counted
    stats: getFeedStats(
      computed([$groups, $expanded], (groups, expanded) => {
        return groups.flatMap(([category, feeds]) => {
          return expanded.has(category.id) ? feeds.map(feed => feed.id) : []
        })
      })
    ),
    sync: followsSyncMixin.sync,
    toggle(categoryId: string) {
      let expanded = new Set($expanded.get())
      if (!expanded.delete(categoryId)) expanded.add(categoryId)
      $expanded.set(expanded)
    }
  }
})

export type CategoriesPage = ReturnType<typeof categoriesPage>
