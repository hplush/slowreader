import { atom, effect } from 'nanostores'

import { getAccounts } from '../account.ts'
import {
  feedsByCategory,
  type FeedsByCategory,
  getCategories
} from '../category.ts'
import { getFeeds } from '../feed.ts'
import { createPage } from './common.ts'
import { injectFollowsSync } from './mixins/follows-sync.ts'
import { injectOpenedFeed } from './mixins/opened-feed.ts'

export const feedsByCategoriesPage = createPage('feedsByCategories', () => {
  let openedFeedMixin = injectOpenedFeed()

  let $accounts = getAccounts()
  let $categories = getCategories()
  let $feeds = getFeeds()
  let followsSyncMixin = injectFollowsSync()

  let $groups = atom<FeedsByCategory>([])
  let $loading = atom(true)

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
        $loading.set(false)
      } else {
        $loading.set(true)
      }
    }
  )

  return {
    ...openedFeedMixin,
    exit() {
      followsSyncMixin.exit()
      unbind()
    },
    groups: $groups,
    loading: $loading,
    params: {},
    sync: followsSyncMixin.sync
  }
})

export type FeedsByCategoriesPage = ReturnType<typeof feedsByCategoriesPage>
