import { ensureLoaded } from '@logux/client'
import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addFilterForFeed,
  addPost,
  changeFeed,
  changeFilter,
  createPostsList,
  deleteFeed,
  deleteFilter,
  type FilterValue,
  getFeed,
  getFeedLatestPosts,
  getPosts,
  hasFeeds,
  loaders,
  loadFeed,
  loadFeeds,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  restoreAll()
  await cleanClientTest()
})

test('adds, loads, changes and removes feed', async () => {
  deepStrictEqual(await loadFeeds(), [])

  let id = await addFeed({
    categoryId: 'general',
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  equal(typeof id, 'string')
  let added = await loadFeeds()
  equal(added.length, 1)
  equal(added[0]!.title, 'RSS')

  equal(await loadFeed(id), added[0])

  let feed = getFeed(id)
  keepMount(feed)
  equal(feed.get(), added[0])

  await changeFeed(id, { title: 'New title' })
  equal(ensureLoaded(feed.get()).title, 'New title')

  await deleteFeed(id)
  deepStrictEqual(await loadFeeds(), [])

  equal(await loadFeed('unknown'), undefined)
})

test('removes feed posts too', async () => {
  let posts = getPosts()
  keepMount(posts)

  let feed1 = await addFeed(testFeed())
  let feed2 = await addFeed(testFeed())
  await addPost(testPost({ feedId: feed1 }))
  await addPost(testPost({ feedId: feed1 }))
  let post3 = await addPost(testPost({ feedId: feed2 }))
  let store1 = getFeed(feed1)

  await deleteFeed(feed1)
  equal(store1.deleted, true)
  deepStrictEqual(
    ensureLoaded(posts.get()).list.map(i => i.id),
    [post3]
  )
})

test('loads latest posts', async () => {
  let page = createPostsList([], undefined)
  let getPage = spyOn(loaders.rss, 'getPosts', () => page)

  let id = await addFeed(
    testFeed({
      loader: 'rss',
      url: 'https://example.com/'
    })
  )
  let feed = await loadFeed(id)

  equal(getFeedLatestPosts(feed!), page)
  equal(getPage.calls.length, 1)
  equal(getPage.calls[0]![1], 'https://example.com/')
})

test('shows that user has any feeds', async () => {
  await cleanClientTest()
  enableClientTest()
  equal(hasFeeds.get(), undefined)
  await setTimeout(10)
  equal(hasFeeds.get(), false)

  let id = await addFeed(testFeed())
  equal(hasFeeds.get(), true)

  await deleteFeed(id)
  equal(hasFeeds.get(), false)
})

test('change feed and post reading status', async () => {
  let feedId = await addFeed(testFeed())
  let feed = getFeed(feedId)
  let posts = getPosts()
  keepMount(feed)
  keepMount(posts)
  await addPost(testPost({ feedId, title: 'Feed post' }))
  await addPost(testPost({ feedId, title: 'Filter post' }))

  let filter: FilterValue = {
    action: 'fast',
    feedId,
    id: '1',
    priority: 100,
    query: 'include(Filter)'
  }

  let filterId = await addFilterForFeed((await loadFeed(feedId))!)
  await changeFilter(filterId, filter)

  equal(ensureLoaded(feed.get()).reading, 'fast')
  equal(ensureLoaded(posts.get()).list[0]?.reading, 'fast')

  await changeFeed(feedId, { reading: 'slow' })

  equal(ensureLoaded(feed.get()).reading, 'slow')
  equal(ensureLoaded(posts.get()).list[0]?.reading, 'slow')
  equal(ensureLoaded(posts.get()).list[1]?.reading, 'fast')

  await deleteFilter(filterId)

  equal(ensureLoaded(posts.get()).list[1]?.reading, 'slow')
})
