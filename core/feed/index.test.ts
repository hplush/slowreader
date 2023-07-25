import '../test/ws.js'

import { cleanStores } from 'nanostores'
import { setTimeout } from 'timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  addFeed,
  Feed,
  feedsStore,
  type FeedValue,
  getClient,
  hasFeedStore,
  userId
} from '../index.js'

test.before.each(() => {
  userId.set('10')
})

test.after.each(async () => {
  await getClient().clean()
  getClient().destroy()
  cleanStores(Feed, userId)
})

async function getFeeds(): Promise<FeedValue[]> {
  let $feeds = feedsStore()
  let unbind = $feeds.listen(() => {})
  await $feeds.loading
  let feeds = $feeds.get().list
  unbind()
  return feeds
}

test('adds feed', async () => {
  equal(await getFeeds(), [])
  await addFeed({ loader: 'rss', title: 'RSS', url: 'https://example.com/' })
  let after = await getFeeds()
  equal(after.length, 1)
  equal(after[0].title, 'RSS')
})

test('tracks feed adding', async () => {
  let $example = hasFeedStore('https://example.com/')
  let $another = hasFeedStore('https://another.com/')
  $example.listen(() => {})
  $another.listen(() => {})

  equal($example.get(), undefined)
  equal($another.get(), undefined)

  await setTimeout(10)
  equal($example.get(), false)
  equal($another.get(), false)

  await addFeed({ loader: 'rss', title: 'RSS', url: 'https://example.com/' })

  equal($example.get(), true)
  equal($another.get(), false)
})

test.run()
