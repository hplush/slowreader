import { atom, effect } from 'nanostores'

import { type FeedValue, getFeeds } from '../feed.ts'
import { formatTimeShort, i18nFormat } from '../format.ts'
import { isObject } from '../loader/common.ts'
import { isWebFeed } from '../loader/index.ts'
import { clock } from '../night-lock.ts'
import { createPage } from './common.ts'
import { injectOpenedFeed } from './mixins/opened-feed.ts'

const YEAR = 365 * 86400

export type DeadFeeds = ['missing' | 'twoYears' | 'year', FeedValue[]][]

function isMissing(feed: FeedValue): boolean {
  if (!isWebFeed(feed.loader) || !feed.loaderData) return false
  try {
    let data: unknown = JSON.parse(feed.loaderData)
    return isObject(data) && data.missing === true
  } catch {
    return false
  }
}

function byLastPost(a: FeedValue, b: FeedValue): number {
  return (a.lastPublishedAt ?? 0) - (b.lastPublishedAt ?? 0)
}

export const deadFeedsPage = createPage('deadFeeds', () => {
  let openedFeedMixin = injectOpenedFeed()

  let $feeds = getFeeds()
  let $groups = atom<DeadFeeds>([])
  let $hints = atom<Record<string, string>>({})
  let $loading = atom(true)

  let unbind = effect([$feeds, i18nFormat], (feeds, format) => {
    if (feeds.status !== 'ready') {
      $loading.set(true)
      return
    }
    let missing: FeedValue[] = []
    let twoYears: FeedValue[] = []
    let year: FeedValue[] = []
    let hints: Record<string, string> = {}
    let now = clock.get().getTime() / 1000
    for (let feed of feeds.value) {
      if (isMissing(feed)) {
        missing.push(feed)
      } else if (feed.lastPublishedAt && now - feed.lastPublishedAt > YEAR) {
        hints[feed.url] = formatTimeShort(
          format,
          new Date(feed.lastPublishedAt * 1000)
        )
        if (now - feed.lastPublishedAt > 2 * YEAR) {
          twoYears.push(feed)
        } else {
          year.push(feed)
        }
      }
    }
    let groups: DeadFeeds = [
      ['missing', missing],
      ['twoYears', twoYears.toSorted(byLastPost)],
      ['year', year.toSorted(byLastPost)]
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
