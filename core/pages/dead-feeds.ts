import { atom, effect } from 'nanostores'

import { type DeadFeed, getDeadFeed, markDeadFeedsSeen } from '../dead-feeds.ts'
import { type FeedValue, getFeeds } from '../feed.ts'
import { formatTimeShort, i18nFormat } from '../format.ts'
import { clock } from '../night-lock.ts'
import { createPage } from './common.ts'
import { injectOpenedFeed } from './mixins/opened-feed.ts'

export type DeadFeeds = [DeadFeed['type'], FeedValue[]][]

function byLastPost(a: FeedValue, b: FeedValue): number {
  return (a.lastPublishedAt ?? 0) - (b.lastPublishedAt ?? 0)
}

export const deadFeedsPage = createPage('deadFeeds', () => {
  let openedFeedMixin = injectOpenedFeed()
  void markDeadFeedsSeen()

  let $feeds = getFeeds()
  let $groups = atom<DeadFeeds>([])
  let $hints = atom<Record<string, string>>({})
  let $loading = atom(true)

  let unbind = effect([$feeds, i18nFormat], (feeds, format) => {
    if (feeds.status !== 'ready') {
      $loading.set(true)
      return
    }
    let lists: Record<DeadFeed['type'], FeedValue[]> = {
      missing: [],
      twoYears: [],
      year: []
    }
    let hints: Record<string, string> = {}
    let now = clock.get().getTime() / 1000
    for (let feed of feeds.value) {
      let dead = getDeadFeed(feed, now)
      if (!dead) continue
      lists[dead.type].push(feed)
      if (dead.type !== 'missing') {
        hints[feed.url] = formatTimeShort(
          format,
          new Date(dead.lastPost * 1000)
        )
      }
    }
    let groups: DeadFeeds = [
      ['missing', lists.missing],
      ['twoYears', lists.twoYears.toSorted(byLastPost)],
      ['year', lists.year.toSorted(byLastPost)]
    ]
    $groups.set(groups.filter(([, list]) => list.length > 0))
    $hints.set(hints)
    $loading.set(false)
  })

  return {
    ...openedFeedMixin,
    exit() {
      unbind()
    },
    groups: $groups,
    hints: $hints,
    loading: $loading,
    params: {}
  }
})

export type DeadFeedsPage = ReturnType<typeof deadFeedsPage>
