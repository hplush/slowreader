import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  checkDeadFeeds,
  createPostsList,
  deadFeedsSeenAt,
  type FeedValue,
  getDeadFeed,
  loaders,
  manyDeadFeeds,
  markDeadFeedsSeen,
  refreshPosts,
  syncedSettingsLoading,
  testFeed,
  waitLoading
} from '../index.ts'
import { cleanClient, startClient } from './utils.ts'

const DAY = 86400
const YEAR = 365 * DAY

let now = Math.round(Date.now() / 1000)

function missing(failedDaysAgo: number): FeedValue {
  return testFeed({
    loaderData: JSON.stringify({
      failedSince: now - failedDaysAgo * DAY,
      missing: true
    })
  })
}

function feeds(count: number, create: () => FeedValue): FeedValue[] {
  return Array.from({ length: count }, create)
}

function silent(): FeedValue {
  return testFeed({ lastPublishedAt: now - YEAR - 10 * DAY })
}

function manyDead(list: FeedValue[]): boolean {
  checkDeadFeeds(list)
  return manyDeadFeeds.get()
}

describe('dead feeds', () => {
  beforeEach(async () => {
    startClient()
    await waitLoading(syncedSettingsLoading)
  })

  afterEach(async () => {
    manyDeadFeeds.set(false)
    restoreAll()
    await cleanClient()
  })

  test('detects dead feeds', () => {
    deepEqual(getDeadFeed(missing(10), now), {
      since: now - 7 * DAY,
      type: 'missing'
    })
    deepEqual(
      getDeadFeed(testFeed({ lastPublishedAt: now - YEAR - DAY }), now),
      { lastPost: now - YEAR - DAY, since: now - DAY, type: 'year' }
    )
    deepEqual(getDeadFeed(testFeed({ lastPublishedAt: now - 3 * YEAR }), now), {
      lastPost: now - 3 * YEAR,
      since: now - 2 * YEAR,
      type: 'twoYears'
    })
    equal(getDeadFeed(testFeed({ lastPublishedAt: now - DAY }), now), undefined)
    equal(getDeadFeed(testFeed(), now), undefined)
  })

  test('suggests cleaning on more than 2 errors', () => {
    equal(
      manyDead([...feeds(2, () => missing(10)), ...feeds(100, testFeed)]),
      false
    )
    equal(
      manyDead([...feeds(3, () => missing(10)), ...feeds(100, testFeed)]),
      true
    )
  })

  test('suggests cleaning on many silent feeds', () => {
    equal(manyDead([...feeds(10, silent), ...feeds(10, testFeed)]), false)
    equal(manyDead([...feeds(11, silent), ...feeds(99, testFeed)]), false)
    equal(manyDead([...feeds(11, silent), ...feeds(98, testFeed)]), true)
    equal(
      manyDead([...feeds(2, () => missing(10)), ...feeds(10, silent)]),
      false
    )
  })

  test('counts only feeds dead after the last visit', async () => {
    deadFeedsSeenAt.set(now - 30 * DAY)
    equal(manyDead(feeds(3, () => missing(40))), false)
    equal(manyDead(feeds(3, () => missing(10))), true)
    equal(
      manyDead(
        feeds(11, () => testFeed({ lastPublishedAt: now - YEAR - 40 * DAY }))
      ),
      false
    )
    equal(manyDead(feeds(11, silent)), true)

    await markDeadFeedsSeen()
    equal(manyDeadFeeds.get(), false)
    equal(deadFeedsSeenAt.get() >= now, true)
    equal(manyDead(feeds(11, silent)), false)
  })

  test('checks feeds on refresh', async () => {
    await addFeed(feeds(3, () => missing(10)))
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => [[], undefined])
    })
    await refreshPosts()
    equal(manyDeadFeeds.get(), true)
  })
})
