import { ensureLoaded } from '@logux/client'
import { restoreAll, spyOn } from 'nanospy'
import { deepStrictEqual, equal, fail, ok } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addFilter,
  checkAndRemoveRequestMock,
  createPostsPage,
  deleteFeed,
  expectRequest,
  getFeed,
  getPosts,
  isRefreshing,
  loaders,
  mockRequest,
  type PostsPageResult,
  type PostValue,
  refreshPosts,
  refreshProgress,
  refreshStatistics,
  stopRefreshing,
  testFeed
} from '../index.js'
import { loadList } from '../utils/stores.js'
import { cleanClientTest, createPromise, enableClientTest } from './utils.js'

beforeEach(() => {
  mockRequest()
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  restoreAll()
  checkAndRemoveRequestMock()
})

async function loadPosts<Key extends keyof PostValue>(
  key: Key
): Promise<PostValue[Key][]> {
  let posts = await loadList(getPosts())
  return posts.map(post => post[key])
}

test('updates posts', async () => {
  let feedId1 = await addFeed(
    testFeed({
      lastOriginId: 'post1',
      loader: 'rss',
      reading: 'slow',
      url: 'https://one.com/'
    })
  )
  let feedId2 = await addFeed(
    testFeed({
      lastOriginId: 'post2',
      lastPublishedAt: 5000,
      loader: 'atom',
      reading: 'fast',
      url: 'https://two.com/'
    })
  )
  await addFilter({
    action: 'slow',
    feedId: feedId2,
    query: 'include(slow)'
  })
  await addFilter({
    action: 'delete',
    feedId: feedId2,
    query: 'include(delete)'
  })
  let feed1 = getFeed(feedId1)
  let feed2 = getFeed(feedId2)

  equal(isRefreshing.get(), false)
  equal(refreshProgress.get(), 0)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 0,
    foundSlow: 0,
    initializing: false,
    missedFeeds: 0,
    processedFeeds: 0,
    totalFeeds: 0
  })

  let rss1 = createPromise<PostsPageResult>()
  let rssLoad = spyOn(loaders.rss, 'getPosts', () => {
    return createPostsPage(undefined, () => rss1.promise())
  })
  let atom1 = createPromise<PostsPageResult>()
  let atomLoad = spyOn(loaders.atom, 'getPosts', () => {
    return createPostsPage(undefined, () => atom1.promise())
  })

  let finished = false
  refreshPosts().then(() => {
    finished = true
  })
  equal(refreshProgress.get(), 0)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 0,
    foundSlow: 0,
    initializing: true,
    missedFeeds: 0,
    processedFeeds: 0,
    totalFeeds: 0
  })

  await setTimeout(10)
  equal(refreshProgress.get(), 0)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 0,
    foundSlow: 0,
    initializing: false,
    missedFeeds: 0,
    processedFeeds: 0,
    totalFeeds: 2
  })
  equal(finished, false)
  equal(rssLoad.calls.length, 1)
  equal(rssLoad.calls[0]![1], 'https://one.com/')
  equal(atomLoad.calls.length, 1)
  equal(atomLoad.calls[0]![1], 'https://two.com/')

  rss1.resolve([
    [
      { media: [], originId: 'post3', title: '3' },
      { media: [], originId: 'post2', title: '2' },
      { media: [], originId: 'post1', title: '1' },
      { media: [], originId: 'post0', title: '0' }
    ],
    undefined
  ])
  await setTimeout(10)
  equal(refreshProgress.get(), 0.5)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 0,
    foundSlow: 2,
    initializing: false,
    missedFeeds: 0,
    processedFeeds: 1,
    totalFeeds: 2
  })
  deepStrictEqual(await loadPosts('title'), ['2', '3'])
  deepStrictEqual(await loadPosts('reading'), ['slow', 'slow'])
  deepStrictEqual(await loadPosts('feedId'), [feedId1, feedId1])
  ok((await loadPosts('publishedAt'))[0]! + 100 > Date.now())
  deepStrictEqual(ensureLoaded(feed1.get()).lastOriginId, 'post3')
  deepStrictEqual(ensureLoaded(feed1.get()).lastPublishedAt, undefined)

  let atom2 = atom1.next()
  atom1.resolve([
    [
      { media: [], originId: 'post9', publishedAt: 9000, title: '9 delete' },
      { media: [], originId: 'post8', publishedAt: 8000, title: '8 slow' },
      { media: [], originId: 'post7', publishedAt: 7000, title: '7' }
    ],
    () => atom2.promise()
  ])
  await setTimeout(10)
  equal(finished, false)
  equal(refreshProgress.get(), 0.5)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 1,
    foundSlow: 3,
    initializing: false,
    missedFeeds: 0,
    processedFeeds: 1,
    totalFeeds: 2
  })
  deepStrictEqual(await loadPosts('title'), ['2', '3', '8 slow', '7'])
  deepStrictEqual(await loadPosts('reading'), ['slow', 'slow', 'slow', 'fast'])
  deepStrictEqual(ensureLoaded(feed2.get()).lastOriginId, 'post2')
  deepStrictEqual(ensureLoaded(feed2.get()).lastPublishedAt, 5000)

  atom2.resolve([
    [
      { media: [], originId: 'post6', publishedAt: 6000, title: '6' },
      { media: [], originId: 'post5', publishedAt: 5000, title: '5' },
      { media: [], originId: 'post4', publishedAt: 4000, title: '4' }
    ],
    async () => {
      fail()
    }
  ])
  await setTimeout(10)
  deepStrictEqual(await loadPosts('title'), ['2', '3', '8 slow', '7', '6'])
  deepStrictEqual(ensureLoaded(feed2.get()).lastOriginId, 'post9')
  deepStrictEqual(ensureLoaded(feed2.get()).lastPublishedAt, 9000)
  equal(finished, true)
  equal(isRefreshing.get(), false)
  equal(refreshProgress.get(), 1)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 2,
    foundSlow: 3,
    initializing: false,
    missedFeeds: 0,
    processedFeeds: 2,
    totalFeeds: 2
  })

  restoreAll()
  spyOn(loaders.rss, 'getPosts', () => {
    return createPostsPage(undefined, async () => {
      return [[{ media: [], originId: 'post3', title: '3' }], undefined]
    })
  })
  spyOn(loaders.atom, 'getPosts', () => {
    return createPostsPage(undefined, async () => {
      return [
        [
          { media: [], originId: 'post9', publishedAt: 9000, title: '9 delete' }
        ],
        undefined
      ]
    })
  })

  refreshPosts()
  equal(isRefreshing.get(), true)
  equal(refreshProgress.get(), 0)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 0,
    foundSlow: 0,
    initializing: true,
    missedFeeds: 0,
    processedFeeds: 0,
    totalFeeds: 0
  })
  await setTimeout(10)
  equal(refreshProgress.get(), 1)
  deepStrictEqual(await loadPosts('title'), ['2', '3', '8 slow', '7', '6'])
})

test('is ready to feed deletion during refreshing', async () => {
  let feedId = await addFeed(
    testFeed({
      lastOriginId: 'post1',
      loader: 'rss',
      reading: 'slow'
    })
  )
  let rss1 = createPromise<PostsPageResult>()
  spyOn(loaders.rss, 'getPosts', () => {
    return createPostsPage(undefined, () => rss1.promise())
  })

  refreshPosts()
  await setTimeout(10)

  let rss2 = rss1.next()
  rss1.resolve([
    [
      { media: [], originId: 'post6', title: '6' },
      { media: [], originId: 'post5', title: '5' },
      { media: [], originId: 'post4', title: '4' }
    ],
    () => rss2.promise()
  ])

  await deleteFeed(feedId)
  await setTimeout(10)
  equal(isRefreshing.get(), false)
  deepStrictEqual(await loadPosts('title'), [])
})

test('cancels refreshing', async () => {
  await addFeed(
    testFeed({
      lastOriginId: 'post1',
      url: 'https://one.com/'
    })
  )

  let rss = expectRequest('https://one.com/').andWait()
  refreshPosts()
  refreshPosts()
  refreshPosts()
  await setTimeout(10)

  stopRefreshing()
  equal(isRefreshing.get(), false)
  equal(rss.aborted, true)
  deepStrictEqual(refreshStatistics.get(), {
    errors: 0,
    foundFast: 0,
    foundSlow: 0,
    initializing: false,
    missedFeeds: 0,
    processedFeeds: 0,
    totalFeeds: 1
  })
  stopRefreshing()
  equal(isRefreshing.get(), false)
})

test('is ready for network errors', async () => {
  await addFeed(
    testFeed({
      lastOriginId: 'post1',
      url: 'https://one.com/'
    })
  )
  await addFeed(
    testFeed({
      lastOriginId: 'post2',
      lastPublishedAt: 5000,
      loader: 'atom'
    })
  )

  let rssHadError = false
  spyOn(loaders.rss, 'getPosts', () => {
    return createPostsPage(undefined, async () => {
      if (rssHadError) {
        return [[{ media: [], originId: 'post1', title: '1' }], undefined]
      } else {
        rssHadError = true
        throw new Error('network error')
      }
    })
  })
  spyOn(loaders.atom, 'getPosts', () => {
    return createPostsPage(undefined, async () => {
      throw new Error('server not working')
    })
  })

  refreshPosts()
  await setTimeout(10)

  deepStrictEqual(refreshStatistics.get(), {
    errors: 2,
    foundFast: 0,
    foundSlow: 0,
    initializing: false,
    missedFeeds: 1,
    processedFeeds: 2,
    totalFeeds: 2
  })
})

test('is ready to not found previous ID and time', async () => {
  let feedId = await addFeed(
    testFeed({
      lastOriginId: 'post1',
      lastPublishedAt: 1000,
      url: 'https://one.com/'
    })
  )
  spyOn(loaders.rss, 'getPosts', () => {
    return createPostsPage(undefined, async () => {
      return [
        [
          { media: [], originId: 'post6', publishedAt: 6000, title: '6' },
          { media: [], originId: 'post5', publishedAt: 5000, title: '5' },
          { media: [], originId: 'post4', publishedAt: 4000, title: '4' }
        ],
        undefined
      ]
    })
  })

  refreshPosts()
  await setTimeout(10)
  equal(isRefreshing.get(), false)
  deepStrictEqual(await loadPosts('title'), ['4', '5', '6'])

  let feed = getFeed(feedId)
  deepStrictEqual(ensureLoaded(feed.get()).lastOriginId, 'post6')
  deepStrictEqual(ensureLoaded(feed.get()).lastPublishedAt, 6000)
})

test('sorts posts', async () => {
  let feedId = await addFeed(
    testFeed({
      lastOriginId: 'post1',
      lastPublishedAt: 1000,
      url: 'https://one.com/'
    })
  )
  spyOn(loaders.rss, 'getPosts', () => {
    return createPostsPage(undefined, async () => {
      return [
        [
          { media: [], originId: 'post1', publishedAt: 1000, title: '1' },
          { media: [], originId: 'postY', title: 'Y' },
          { media: [], originId: 'post2', publishedAt: 2000, title: '2' },
          { media: [], originId: 'post4', publishedAt: 4000, title: '4' },
          { media: [], originId: 'post3', publishedAt: 3000, title: '3' },
          { media: [], originId: 'postX', title: 'X' }
        ],
        undefined
      ]
    })
  })

  refreshPosts()
  await setTimeout(10)
  equal(isRefreshing.get(), false)
  deepStrictEqual(await loadPosts('title'), ['2', '3', '4'])

  let feed = getFeed(feedId)
  deepStrictEqual(ensureLoaded(feed.get()).lastOriginId, 'post4')
  deepStrictEqual(ensureLoaded(feed.get()).lastPublishedAt, 4000)
})
