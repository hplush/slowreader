import '../test/ws.js'

import { cleanStores } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  addFeed,
  feedsStore,
  type FeedValue,
  getClient,
  userId
} from '../index.js'

test.before(() => {
  userId.set('10')
})

test.after(() => {
  getClient().destroy()
  cleanStores(userId)
})

async function getFeeds(): Promise<FeedValue[]> {
  let feeds = feedsStore()
  let unbind = feeds.listen(() => {})
  await feeds.loading
  let list = feeds.get().list
  unbind()
  return list
}

test('adds feed', async () => {
  equal(await getFeeds(), [])
  await addFeed({ loader: 'rss', title: 'RSS', url: 'https://example.com/' })
  let after = await getFeeds()
  equal(after.length, 1)
  equal(after[0].title, 'RSS')
})

test.run()
