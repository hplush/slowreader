import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  addPost,
  cleanFeedRedirects,
  createDownloadTask,
  createPostsList,
  type DownloadTask,
  feedRedirects,
  loadFeed,
  loaders,
  loadFeeds,
  loadPosts,
  ParseError,
  refreshPosts,
  trackFeedRedirect,
  testFeed,
  testPost,
  waitLoading,
  syncedSettingsLoading
} from '../index.ts'
import { cleanClient, expectWarning, startClient } from './utils.ts'

const DAY = 24 * 60 * 60_000

describe('feed redirects', () => {
  beforeEach(() => {
    startClient()
    feedRedirects.set({})
  })

  afterEach(async () => {
    feedRedirects.set({})
    await cleanClient()
  })

  function redirected(
    from: string,
    url: string,
    permanent = true
  ): DownloadTask {
    let task = createDownloadTask()
    task.redirects.set(from, { permanent, url })
    return task
  }

  test('moves feed after 3 days of permanent redirect', async () => {
    let feedId = await addFeed(
      testFeed({
        categoryId: 'blogs',
        loader: 'rss',
        originTitle: 'Blog',
        title: 'My Blog',
        url: 'http://a.com/rss'
      })
    )
    await addPost(testPost({ feedId, originId: 'post' }))
    let feed = (await loadFeed(feedId))!

    await trackFeedRedirect(feed, redirected(feed.url, 'https://b.com/feed'))
    let since = feedRedirects.get()[feedId]![1]
    deepEqual(feedRedirects.get(), { [feedId]: ['https://b.com/feed', since] })

    await trackFeedRedirect(feed, redirected(feed.url, 'https://b.com/feed'))
    deepEqual(feedRedirects.get(), { [feedId]: ['https://b.com/feed', since] })
    equal((await loadFeed(feedId))!.url, 'http://a.com/rss')

    feedRedirects.set({
      [feedId]: ['https://b.com/feed', Date.now() - 4 * DAY]
    })
    await trackFeedRedirect(feed, redirected(feed.url, 'https://b.com/feed'))
    deepEqual(feedRedirects.get(), {})
    let moved = (await loadFeed(feedId))!
    deepEqual(
      [moved.url, moved.title, moved.originTitle, moved.categoryId],
      ['https://b.com/feed', 'My Blog', 'Blog', 'blogs']
    )
    deepEqual(
      (await loadPosts()).map(i => i.feedId),
      [feedId]
    )
  })

  test('forgets temporary and changed redirects', async () => {
    let feed = (await loadFeed(
      await addFeed(testFeed({ loader: 'atom', url: 'http://a.com/atom' }))
    ))!
    let old = Date.now() - 4 * DAY

    feedRedirects.set({ [feed.id]: ['https://b.com/feed', old] })
    await trackFeedRedirect(
      feed,
      redirected(feed.url, 'https://b.com/feed', false)
    )
    deepEqual(feedRedirects.get(), {})

    feedRedirects.set({ [feed.id]: ['https://b.com/feed', old] })
    await trackFeedRedirect(feed, createDownloadTask())
    deepEqual(feedRedirects.get(), {})
    await trackFeedRedirect(feed, createDownloadTask())
    deepEqual(feedRedirects.get(), {})

    feedRedirects.set({ [feed.id]: ['https://b.com/feed', old] })
    await trackFeedRedirect(feed, redirected(feed.url, 'https://c.com/feed'))
    equal(feedRedirects.get()[feed.id]![0], 'https://c.com/feed')
    equal((await loadFeed(feed.id))!.url, 'http://a.com/atom')
  })

  test('merges feed into existing feed of new URL', async () => {
    let old = await addFeed(
      testFeed({ loader: 'rss', url: 'http://a.com/rss' })
    )
    let existing = await addFeed(
      testFeed({ loader: 'rss', url: 'https://b.com/feed' })
    )
    await addPost(testPost({ feedId: old, originId: 'post' }))
    feedRedirects.set({ [old]: ['https://b.com/feed', Date.now() - 4 * DAY] })

    let feed = (await loadFeed(old))!
    await trackFeedRedirect(feed, redirected(feed.url, 'https://b.com/feed'))
    deepEqual(
      (await loadFeeds()).map(i => i.id),
      [existing]
    )
    deepEqual(
      (await loadPosts()).map(i => i.feedId),
      [existing]
    )
  })

  test('ignores social feeds', async () => {
    let feed = (await loadFeed(
      await addFeed(
        testFeed({ loader: 'mastodon', url: 'https://a.social/@ann' })
      )
    ))!
    await trackFeedRedirect(feed, redirected(feed.url, 'https://b.social/@ann'))
    deepEqual(feedRedirects.get(), {})
  })

  test('cleans records of deleted feeds', async () => {
    let feedId = await addFeed(testFeed({ loader: 'rss' }))
    let records = { [feedId]: ['https://b.com/feed', 1] as [string, number] }
    feedRedirects.set(records)
    cleanFeedRedirects([{ id: feedId }])
    equal(feedRedirects.get(), records)

    feedRedirects.set({ ...records, deleted: ['https://c.com/', 1] })
    cleanFeedRedirects([{ id: feedId }])
    deepEqual(feedRedirects.get(), records)
  })
})

describe('feed redirects in refresh', () => {
  beforeEach(async () => {
    startClient()
    await waitLoading(syncedSettingsLoading)
  })

  afterEach(async () => {
    restoreAll()
    feedRedirects.set({})
    await cleanClient()
  })

  test('keeps record on failed refresh', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'rss', url: 'https://a.com/rss' })
    )
    let record: [string, number] = ['https://b.com/feed', 1]
    feedRedirects.set({ [feedId]: record, deleted: record })

    let error = new ParseError('Broken feed')
    let posts = spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => Promise.reject(error))
    })
    await expectWarning(() => refreshPosts(), [error])
    deepEqual(feedRedirects.get(), { [feedId]: record })

    posts.nextResult(createPostsList(() => [[], undefined]))
    await refreshPosts()
    deepEqual(feedRedirects.get(), {})
  })
})
