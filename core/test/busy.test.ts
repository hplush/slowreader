import { equal } from 'node:assert'
import { afterEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { busy, busyDuring } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

afterEach(async () => {
  await cleanClientTest()
})

test('shows that core stores are loading', async () => {
  enableClientTest()
  equal(busy.get(), true)
  await setTimeout(10)
  equal(busy.get(), false)
})

test('allows to manually set busy state', async () => {
  equal(busy.get(), false)
  await busyDuring(async () => {
    equal(busy.get(), true)
    await busyDuring(async () => {
      equal(busy.get(), true)
      await setTimeout(10)
    })
    equal(busy.get(), true)
  })
  equal(busy.get(), false)
})
