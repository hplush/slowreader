import { restoreAll, spyOn } from 'nanospy'
import { equal, match } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  changeFeed,
  createPostsList,
  type FeedValue,
  forgetFeedError,
  getMissingSince,
  HTTPStatusError,
  loaders,
  loadFeed,
  NetworkError,
  ParseError,
  type PostsList,
  refreshPosts,
  syncedSettingsLoading,
  testFeed,
  trackFeedError,
  waitLoading
} from '../index.ts'
import { cleanClient, expectWarning, startClient } from './utils.ts'

function status(code: number, response = ''): HTTPStatusError {
  return new HTTPStatusError(code, 'https://a.com/rss', response, new Headers())
}

function failedDaysAgo(days: number, missing = false): string {
  return JSON.stringify({
    failedSince: Math.round(Date.now() / 1000) - days * 24 * 60 * 60,
    missing
  })
}

function withPost(): PostsList {
  return createPostsList(() => [[{ originId: '1', title: '1' }], undefined])
}

function empty(): PostsList {
  return createPostsList(() => [[], undefined])
}

async function reload(feed: FeedValue): Promise<FeedValue> {
  return (await loadFeed(feed.id))!
}

async function create(fields: Partial<FeedValue>): Promise<FeedValue> {
  return (await loadFeed(await addFeed(testFeed(fields))))!
}

describe('missing feeds', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('marks feed as missing after 3 days of errors', async () => {
    let feed = await create({ loader: 'rss' })
    let before = Math.round(Date.now() / 1000)
    await trackFeedError(feed, status(404))
    feed = await reload(feed)
    let since = (JSON.parse(feed.loaderData!) as { failedSince: number })
      .failedSince
    equal(since >= before, true)
    equal(
      feed.loaderData,
      JSON.stringify({ failedSince: since, missing: false })
    )

    await changeFeed(feed.id, { loaderData: failedDaysAgo(2) })
    feed = await reload(feed)
    await trackFeedError(feed, status(404))
    equal((await reload(feed)).loaderData, feed.loaderData)

    let old = failedDaysAgo(4)
    await changeFeed(feed.id, { loaderData: old })
    feed = await reload(feed)
    equal(getMissingSince(feed), undefined)
    await trackFeedError(feed, status(404))
    feed = await reload(feed)
    equal(feed.loaderData, old.replace('false', 'true'))
    equal(
      getMissingSince(feed),
      (JSON.parse(old) as { failedSince: number }).failedSince + 3 * 86400
    )

    await trackFeedError(feed, status(404))
    equal((await reload(feed)).loaderData, feed.loaderData)
  })

  test('tracks deleted feeds and domains', async () => {
    for (let error of [
      status(404),
      status(410),
      status(400, 'getaddrinfo ENOTFOUND a.com\n'),
      new Error('ENOTFOUND')
    ]) {
      let feed = await create({ loader: 'atom' })
      await trackFeedError(feed, error)
      equal(typeof (await reload(feed)).loaderData, 'string')
    }
  })

  test('ignores errors of working sites and of network', async () => {
    let failed = failedDaysAgo(4)
    for (let error of [
      status(400, 'Timeout\n'),
      status(403),
      status(500),
      new HTTPStatusError(500, 'https://a.com/ENOTFOUND', '', new Headers()),
      new NetworkError(new TypeError('Failed to fetch')),
      new ParseError('Broken feed')
    ]) {
      let fresh = await create({ loader: 'jsonFeed' })
      await trackFeedError(fresh, error)
      equal((await reload(fresh)).loaderData, null)

      let tracked = await create({ loader: 'rss1', loaderData: failed })
      await trackFeedError(tracked, error)
      equal((await reload(tracked)).loaderData, failed)
    }
  })

  test('forgets errors', async () => {
    let missing = await create({
      loader: 'rss',
      loaderData: failedDaysAgo(4, true)
    })
    await forgetFeedError(missing)
    equal((await reload(missing)).loaderData, null)

    for (let loaderData of ['{', '{"missing":true}', '[1]']) {
      let broken = await create({ loader: 'rss', loaderData })
      await forgetFeedError(broken)
      equal((await reload(broken)).loaderData, loaderData)
    }
  })

  test('ignores social feeds', async () => {
    let loaderData = JSON.stringify({ failedSince: 1, id: '1', missing: true })
    let feed = await create({ loader: 'mastodon', loaderData })
    await forgetFeedError(feed)
    await trackFeedError(feed, status(404))
    equal((await reload(feed)).loaderData, loaderData)

    let other = await create({ loader: 'bluesky', loaderData: null })
    await trackFeedError(other, status(404))
    equal((await reload(other)).loaderData, null)
  })
})

describe('missing feeds in refresh', () => {
  beforeEach(async () => {
    startClient()
    await waitLoading(syncedSettingsLoading)
  })

  afterEach(async () => {
    restoreAll()
    await cleanClient()
  })

  test('tracks missing feed until it works again', async () => {
    let feed = await create({ loader: 'rss' })
    let alive = await create({ loader: 'atom' })
    spyOn(loaders.atom, 'getPosts', withPost)

    let error = status(404)
    let requests = 0
    let posts = spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => {
        requests += 1
        return Promise.reject(error)
      })
    })
    await expectWarning(() => refreshPosts(), [error])
    equal(requests, 3)
    match(
      (await reload(feed)).loaderData!,
      /^\{"failedSince":\d+,"missing":false\}$/
    )
    equal((await reload(alive)).loaderData, null)

    let old = failedDaysAgo(4)
    await changeFeed(feed.id, { loaderData: old })
    await expectWarning(() => refreshPosts(), [error])
    equal((await reload(feed)).loaderData, old.replace('false', 'true'))
    equal((await reload(alive)).loaderData, null)

    posts.nextResult(empty())
    await refreshPosts()
    equal((await reload(feed)).loaderData, old.replace('false', 'true'))

    posts.nextResult(withPost())
    await refreshPosts()
    equal((await reload(feed)).loaderData, null)
  })

  test('tracks feed without posts', async () => {
    let feed = await create({ loader: 'rss' })
    let social = await create({ loader: 'mastodon' })
    spyOn(loaders.rss, 'getPosts', empty)
    spyOn(loaders.mastodon, 'getPosts', empty)
    await refreshPosts()
    match(
      (await reload(feed)).loaderData!,
      /^\{"failedSince":\d+,"missing":false\}$/
    )
    equal((await reload(social)).loaderData, null)

    let old = failedDaysAgo(4)
    await changeFeed(feed.id, { loaderData: old })
    await refreshPosts()
    equal((await reload(feed)).loaderData, old.replace('false', 'true'))
  })

  test('tracks feed without posts after first posts', async () => {
    let feed = await create({
      lastPublishedAt: Math.round(Date.now() / 1000),
      loader: 'rss'
    })
    spyOn(loaders.rss, 'getPosts', empty)
    await refreshPosts()
    match(
      (await reload(feed)).loaderData!,
      /^\{"failedSince":\d+,"missing":false\}$/
    )
  })

  test('does not track unchanged feed', async () => {
    let feed = await create({ loader: 'rss' })
    spyOn(loaders.rss, 'getPosts', () => createPostsList(() => 'unchanged'))
    await refreshPosts()
    equal((await reload(feed)).loaderData, null)
  })

  test('loads whole failing feed', async () => {
    let refreshedAt = Math.round(Date.now() / 1000)
    let alive = await create({ loader: 'rss', refreshedAt })
    let failing = await create({
      loader: 'rss',
      loaderData: failedDaysAgo(1),
      refreshedAt
    })
    let posts = spyOn(loaders.rss, 'getPosts', withPost)
    await refreshPosts()
    let last = new Map(posts.calls.map(call => [call[1], call[3]]))
    equal(last.get(alive.url)?.refreshedAt, refreshedAt)
    equal(last.get(failing.url)?.refreshedAt, null)
    equal((await reload(failing)).loaderData, null)
  })

  test('does not blame feeds when nobody answers', async () => {
    let feed = await create({ loader: 'rss' })
    let error = status(400, 'getaddrinfo ENOTFOUND a.com\n')
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => Promise.reject(error))
    })
    await expectWarning(() => refreshPosts(), [error])
    equal((await reload(feed)).loaderData, null)
  })
})
