import type { SyncMapValues } from '@logux/actions'
import type { LoadedSyncMapValue, SyncMapValue } from '@logux/client'
import { cleanStores, keepMount } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  addFeed,
  changeFeed,
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

function ensureLoaded<Value extends SyncMapValues>(
  value: SyncMapValue<Value>
): LoadedSyncMapValue<Value> {
  if (value.isLoading) {
    throw new Error('Store was not loaded yet')
  } else {
    return value
  }
}

test('adds, loads, changes and removes feed', async () => {
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

  let feed = getFeed(added[0].id)
  keepMount(feed)
  equal(feed.get(), added[0])

  await changeFeed(added[0].id, 'title', 'New title')
  equal(ensureLoaded(feed.get()).title, 'New title')

  await deleteFeed(added[0].id)
  let deleted = await getFeeds()
  equal(deleted.length, 0)
})

test.run()
