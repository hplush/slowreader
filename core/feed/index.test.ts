import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  addFeed,
  enableClientTest,
  Feed,
  feedsStore,
  type FeedValue,
  userId
} from '../index.js'

test.before.each(() => {
  enableClientTest()
  userId.set('10')
})

test.after.each(async () => {
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

test.run()
