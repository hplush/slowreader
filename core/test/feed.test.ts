import { ensureLoaded, loadValue } from '@logux/client'
import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  changeFeed,
  createPostsPage,
  deleteFeed,
  getFeed,
  getFeedLatestPosts,
  getFeeds,
  hasFeeds,
  loaders
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  restoreAll()
  await cleanClientTest()
})

test('adds, loads, changes and removes feed', async () => {
  deepStrictEqual((await loadValue(getFeeds())).list, [])

  let id = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  equal(typeof id, 'string')
  let added = (await loadValue(getFeeds())).list
  equal(added.length, 1)
  equal(added[0].title, 'RSS')

  let feed = getFeed(id)
  keepMount(feed)
  equal(feed.get(), added[0])

  await changeFeed(id, { title: 'New title' })
  equal(ensureLoaded(feed.get()).title, 'New title')

  await deleteFeed(id)
  let deleted = (await loadValue(getFeeds())).list
  equal(deleted.length, 0)
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
  equal(getPage.calls[0][1], 'https://example.com/')
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
