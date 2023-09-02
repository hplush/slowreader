import { ensureLoaded, loadValue } from '@logux/client'
import { cleanStores, keepMount } from 'nanostores'
import { test } from 'uvu'
import { equal, type } from 'uvu/assert'

import {
  addFeed,
  changeFeed,
  deleteFeed,
  enableClientTest,
  Feed,
  feedsStore,
  getFeed,
  userId
} from './index.js'

test.before.each(() => {
  enableClientTest()
  userId.set('10')
})

test.after.each(async () => {
  cleanStores(Feed, userId)
})

test('adds, loads, changes and removes feed', async () => {
  equal((await loadValue(feedsStore())).list, [])

  let id = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  type(id, 'string')
  let added = (await loadValue(feedsStore())).list
  equal(added.length, 1)
  equal(added[0].title, 'RSS')

  let feed = getFeed(id)
  keepMount(feed)
  equal(feed.get(), added[0])

  await changeFeed(id, { title: 'New title' })
  equal(ensureLoaded(feed.get()).title, 'New title')

  await deleteFeed(id)
  let deleted = (await loadValue(feedsStore())).list
  equal(deleted.length, 0)
})

test.run()
