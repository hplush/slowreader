import { ensureLoaded, loadValue } from '@logux/client'
import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
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
  loaders
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
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  equal(typeof id, 'string')
  let added = await loadList(getFeeds())
  equal(added.length, 1)
  equal(added[0]!.title, 'RSS')

  let feed = getFeed(id)
  keepMount(feed)
  equal(feed.get(), added[0])

  await changeFeed(id, { title: 'New title' })
  equal(ensureLoaded(feed.get()).title, 'New title')

  await deleteFeed(id)
  deepStrictEqual(await loadList(getFeeds()), [])
})

test('removes feed posts too', async () => {
  let posts = getPosts()
  keepMount(posts)

  let feed1 = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  let feed2 = await addFeed({
    loader: 'atom',
    reading: 'fast',
    title: 'Atom',
    url: 'https://example.com/atom'
  })
  await addPost({
    feedId: feed1,
    media: [],
    originId: '1',
    publishedAt: 0,
    reading: 'fast',
    title: '1'
  })
  await addPost({
    feedId: feed1,
    media: [],
    originId: '2',
    publishedAt: 0,
    reading: 'fast',
    title: '2'
  })
  let post3 = await addPost({
    feedId: feed2,
    media: [],
    originId: '3',
    publishedAt: 0,
    reading: 'fast',
    title: '3'
  })
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

  let id = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  let feed = await loadValue(getFeed(id))

  equal(getFeedLatestPosts(feed), page)
  equal(getPage.calls.length, 1)
  equal(getPage.calls[0]![1], 'https://example.com/')
})

test('shows that user has any feeds', async () => {
  equal(hasFeeds.get(), undefined)
  await setTimeout(10)
  equal(hasFeeds.get(), false)

  let id = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  equal(hasFeeds.get(), true)

  await deleteFeed(id)
  equal(hasFeeds.get(), false)
})
