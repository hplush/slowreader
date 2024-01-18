import { equal } from 'node:assert'
import { afterEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { starting } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

afterEach(async () => {
  await cleanClientTest()
})

test('shows that core stores are loading', async () => {
  enableClientTest()
  equal(starting.get(), true)
  await setTimeout(10)
  equal(starting.get(), false)
})
