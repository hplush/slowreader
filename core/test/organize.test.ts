import { cleanStores, keepMount } from 'nanostores'
import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { addFeed, organizeFeeds, organizeLoading } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

test.before.each(() => {
  enableClientTest()
})

test.after.each(async () => {
  await cleanClientTest()
  cleanStores(organizeFeeds, organizeLoading)
})

test('adds feed', async () => {
  keepMount(organizeLoading)
  keepMount(organizeFeeds)

  equal(organizeLoading.get(), true)

  await setTimeout(10)
  equal(organizeLoading.get(), false)
  equal(organizeFeeds.get(), [])

  let id = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  equal(organizeFeeds.get(), [
    {
      id,
      isLoading: false,
      loader: 'rss',
      reading: 'fast',
      title: 'RSS',
      url: 'https://example.com/'
    }
  ])
})

test.run()
