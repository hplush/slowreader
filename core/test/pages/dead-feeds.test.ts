import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addAccount,
  addFeed,
  changeFeed,
  deadFeedsSeenAt,
  type FeedValue,
  i18nFormat,
  loadFeed,
  syncedSettingsLoading,
  testAccount,
  testFeed,
  waitLoading
} from '../../index.ts'
import { cleanClient, openPage, startClient } from '../utils.ts'

function yearsAgo(years: number): number {
  return Math.round(Date.now() / 1000 - years * 365 * 86400)
}

function hints(feeds: (FeedValue | undefined)[]): Record<string, string> {
  return Object.fromEntries(
    feeds.map(feed => [
      feed!.url,
      i18nFormat.get().time(new Date(feed!.lastPublishedAt! * 1000), {
        month: 'short',
        year: 'numeric'
      })
    ])
  )
}

describe('dead feeds page', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('groups dead feeds', async () => {
    let page = openPage({ params: {}, route: 'deadFeeds' })
    equal(page.loading.get(), true)
    await waitLoading(page.loading)
    deepEqual(page.groups.get(), [])
    await waitLoading(syncedSettingsLoading)
    equal(deadFeedsSeenAt.get() > yearsAgo(0) - 60, true)

    await addFeed(testFeed({ lastPublishedAt: yearsAgo(0.9) }))
    await addFeed(testFeed({ lastPublishedAt: null }))
    await addFeed(
      testFeed({
        lastPublishedAt: yearsAgo(0.1),
        loaderData: '{"failedSince":1,"missing":false}'
      })
    )
    deepEqual(page.groups.get(), [])

    let missing1 = await addFeed(
      testFeed({
        lastPublishedAt: yearsAgo(3),
        loader: 'atom',
        loaderData: '{"failedSince":1,"missing":true}',
        title: 'B'
      })
    )
    let missing2 = await addFeed(
      testFeed({ loaderData: '{"failedSince":1,"missing":true}', title: 'A' })
    )
    let social = await addFeed(
      testFeed({
        accountId: await addAccount(testAccount({ reading: 'slow' })),
        lastPublishedAt: yearsAgo(1.1),
        loader: 'mastodon',
        loaderData: '{"missing":true}',
        reading: null,
        title: 'A'
      })
    )
    let broken = await addFeed(
      testFeed({
        lastPublishedAt: yearsAgo(1.9),
        loaderData: 'broken',
        title: 'B'
      })
    )
    let old = await addFeed(
      testFeed({ lastPublishedAt: yearsAgo(2.1), title: 'A' })
    )
    let oldest = await addFeed(
      testFeed({ lastPublishedAt: yearsAgo(5), loaderData: 'null', title: 'B' })
    )
    deepEqual(page.groups.get(), [
      ['missing', [await loadFeed(missing2), await loadFeed(missing1)]],
      ['twoYears', [await loadFeed(oldest), await loadFeed(old)]],
      ['year', [await loadFeed(broken), await loadFeed(social)]]
    ])
    deepEqual(
      page.hints.get(),
      hints([
        await loadFeed(oldest),
        await loadFeed(old),
        await loadFeed(broken),
        await loadFeed(social)
      ])
    )
    equal(page.readings.get()[(await loadFeed(social))!.url], 'slow')
    equal(page.readings.get()[(await loadFeed(old))!.url], 'fast')

    await changeFeed(missing1, { loaderData: null })
    await changeFeed(missing2, { loaderData: null })
    await changeFeed(old, { lastPublishedAt: yearsAgo(0) })
    deepEqual(page.groups.get(), [
      ['twoYears', [await loadFeed(oldest), await loadFeed(missing1)]],
      ['year', [await loadFeed(broken), await loadFeed(social)]]
    ])

    openPage({ params: {}, route: 'welcome' })
    await changeFeed(broken, { lastPublishedAt: yearsAgo(0) })
    equal(page.groups.get()[1]![1].length, 2)
  })
})
