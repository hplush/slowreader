import { restoreAll, spyOn } from 'nanospy'
import { deepStrictEqual, equal, fail, ok } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addFilter,
  checkAndRemoveRequestMock,
  createPostsList,
  deleteFeed,
  expectRequest,
  isRefreshing,
  loaders,
  loadFeed,
  loadPosts,
  mockRequest,
  type PostsListResult,
  type PostValue,
  refreshPosts,
  refreshProgress,
  refreshStatistics,
  stopRefreshing,
  testFeed
} from '../index.ts'
import { cleanClientTest, createPromise, enableClientTest } from './utils.ts'

beforeEach(() => {
  mockRequest()
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  restoreAll()
  checkAndRemoveRequestMock()
})

async function getPostKeys<Key extends keyof PostValue>(
  key: Key
): Promise<PostValue[Key][]> {
  let posts = await loadPosts()
  return posts
    .sort((a, b) => a.originId.localeCompare(b.originId))
    .map(post => post[key])
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

  let rss1 = createPromise<PostsListResult>()
  let rssLoad = spyOn(loaders.rss, 'getPosts', () => {
    return createPostsList(undefined, () => rss1.promise())
  })
  let atom1 = createPromise<PostsListResult>()
  let atomLoad = spyOn(loaders.atom, 'getPosts', () => {
    return createPostsList(undefined, () => atom1.promise())
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
  deepStrictEqual(await getPostKeys('title'), ['2', '3'])
  deepStrictEqual(await getPostKeys('reading'), ['slow', 'slow'])
  deepStrictEqual(await getPostKeys('feedId'), [feedId1, feedId1])
  ok((await getPostKeys('publishedAt'))[0]! + 100 > Date.now())
  deepStrictEqual((await loadFeed(feedId1))!.lastOriginId, 'post3')
  deepStrictEqual((await loadFeed(feedId1))!.lastPublishedAt, undefined)

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
  deepStrictEqual(await getPostKeys('title'), ['2', '3', '7', '8 slow'])
  deepStrictEqual(await getPostKeys('reading'), [
    'slow',
    'slow',
    'fast',
    'slow'
  ])
  deepStrictEqual((await loadFeed(feedId2))!.lastOriginId, 'post2')
  deepStrictEqual((await loadFeed(feedId2))!.lastPublishedAt, 5000)

  atom2.resolve([
    [
      { media: [], originId: 'post6', publishedAt: 6000, title: '6' },
      { media: [], originId: 'post5', publishedAt: 5000, title: '5' },
      { media: [], originId: 'post4', publishedAt: 4000, title: '4' }
    ],
    () => {
      fail()
    }
  ])
  await setTimeout(10)
  deepStrictEqual(await getPostKeys('title'), ['2', '3', '6', '7', '8 slow'])
  deepStrictEqual((await loadFeed(feedId2))!.lastOriginId, 'post9')
  deepStrictEqual((await loadFeed(feedId2))!.lastPublishedAt, 9000)
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
    return createPostsList(undefined, () => {
      return Promise.resolve([
        [{ media: [], originId: 'post3', title: '3' }],
        undefined
      ])
    })
  })
  spyOn(loaders.atom, 'getPosts', () => {
    return createPostsList(undefined, () => {
      return Promise.resolve([
        [
          { media: [], originId: 'post9', publishedAt: 9000, title: '9 delete' }
        ],
        undefined
      ])
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
  deepStrictEqual(await getPostKeys('title'), ['2', '3', '6', '7', '8 slow'])
})

test('is ready to feed deletion during refreshing', async () => {
  let feedId = await addFeed(
    testFeed({
      lastOriginId: 'post1',
      loader: 'rss',
      reading: 'slow'
    })
  )
  let rss1 = createPromise<PostsListResult>()
  spyOn(loaders.rss, 'getPosts', () => {
    return createPostsList(undefined, () => rss1.promise())
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
  deepStrictEqual(await getPostKeys('title'), [])
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
    return createPostsList(undefined, async () => {
      if (rssHadError) {
        return Promise.resolve([
          [{ media: [], originId: 'post1', title: '1' }],
          undefined
        ])
      } else {
        rssHadError = true
        throw new Error('network error')
      }
    })
  })
  spyOn(loaders.atom, 'getPosts', () => {
    return createPostsList(undefined, async () => {
      await setTimeout(1)
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
    return createPostsList(undefined, () => {
      return Promise.resolve([
        [
          { media: [], originId: 'post6', publishedAt: 6000, title: '6' },
          { media: [], originId: 'post5', publishedAt: 5000, title: '5' },
          { media: [], originId: 'post4', publishedAt: 4000, title: '4' }
        ],
        undefined
      ])
    })
  })

  refreshPosts()
  await setTimeout(10)
  equal(isRefreshing.get(), false)
  deepStrictEqual(await getPostKeys('title'), ['4', '5', '6'])

  let feed = await loadFeed(feedId)
  deepStrictEqual(feed!.lastOriginId, 'post6')
  deepStrictEqual(feed!.lastPublishedAt, 6000)
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
    return createPostsList(undefined, () => {
      return Promise.resolve([
        [
          { media: [], originId: 'post1', publishedAt: 1000, title: '1' },
          { media: [], originId: 'postY', title: 'Y' },
          { media: [], originId: 'post2', publishedAt: 2000, title: '2' },
          { media: [], originId: 'post4', publishedAt: 4000, title: '4' },
          { media: [], originId: 'post3', publishedAt: 3000, title: '3' },
          { media: [], originId: 'postX', title: 'X' }
        ],
        undefined
      ])
    })
  })

  refreshPosts()
  await setTimeout(10)
  equal(isRefreshing.get(), false)
  deepStrictEqual(await getPostKeys('title'), ['2', '3', '4'])

  let feed = await loadFeed(feedId)
  deepStrictEqual(feed!.lastOriginId, 'post4')
  deepStrictEqual(feed!.lastPublishedAt, 4000)
})
