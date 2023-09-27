import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { appLoading } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('shows that core stores are loading', async () => {
  equal(appLoading.get(), true)
  await setTimeout(10)
  equal(appLoading.get(), false)
})
