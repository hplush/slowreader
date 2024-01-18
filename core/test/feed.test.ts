import { ensureLoaded } from '@logux/client'
import { restoreAll, spyOn } from 'nanospy'
import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  changeFeed,
  createPostsPage,
  deleteFeed,
  getFeed,
  getFeedLatestPosts,
  getFeeds,
  getPosts,
  hasFeeds,
  loaders,
  loadFeed,
  testFeed,
  testPost
} from '../index.js'
import { loadList } from '../utils/stores.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  restoreAll()
  await cleanClientTest()
})

test('adds, loads, changes and removes feed', async () => {
  deepStrictEqual(await loadList(getFeeds()), [])

  let id = await addFeed({
    categoryId: 'general',
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  equal(typeof id, 'string')
  let added = await loadList(getFeeds())
  equal(added.length, 1)
  equal(added[0]!.title, 'RSS')

  equal(await loadFeed(id), added[0])

  let feed = getFeed(id)
  keepMount(feed)
  equal(feed.get(), added[0])

  await changeFeed(id, { title: 'New title' })
  equal(ensureLoaded(feed.get()).title, 'New title')

  await deleteFeed(id)
  deepStrictEqual(await loadList(getFeeds()), [])

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
  let page = createPostsPage([], undefined)
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
  cleanStores(hasFeeds)
  equal(hasFeeds.get(), undefined)
  await setTimeout(10)
  equal(hasFeeds.get(), false)

  let id = await addFeed(testFeed())
  equal(hasFeeds.get(), true)

  await deleteFeed(id)
  equal(hasFeeds.get(), false)
})
