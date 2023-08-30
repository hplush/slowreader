import type { LoadedSyncMapValue } from '@logux/client'
import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  addFeed,
  deleteFeed,
  enableClientTest,
  Feed,
  feedsStore,
  type FeedValue,
  getFeed,
  userId
} from '../index.js'

test.before.each(() => {
  enableClientTest()
  userId.set('10')
})

test.after.each(async () => {
  cleanStores(Feed, userId)
})

async function getFeeds(): Promise<LoadedSyncMapValue<FeedValue>[]> {
  let $feeds = feedsStore()
  let unbind = $feeds.listen(() => {})
  await $feeds.loading
  let feeds = $feeds.get().list
  unbind()
  return feeds
}

test('adds, loads and removes feed', async () => {
  equal(await getFeeds(), [])

  await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  let added = await getFeeds()
  equal(added.length, 1)
  equal(added[0].title, 'RSS')

  equal(getFeed(added[0].id).get(), added[0])

  await deleteFeed(added[0].id)
  let deleted = await getFeeds()
  equal(deleted.length, 0)
})

test.run()
