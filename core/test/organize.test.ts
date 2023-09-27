import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { addFeed, organizeFeeds, organizeLoading } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(organizeFeeds, organizeLoading)
})

test('adds feed', async () => {
  keepMount(organizeLoading)
  keepMount(organizeFeeds)

  equal(organizeLoading.get(), true)

  await setTimeout(10)
  equal(organizeLoading.get(), false)
  deepStrictEqual(organizeFeeds.get(), [])

  let id = await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://example.com/'
  })
  deepStrictEqual(organizeFeeds.get(), [
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
