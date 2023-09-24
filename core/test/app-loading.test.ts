import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { appLoading } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

test.before.each(() => {
  enableClientTest()
})

test.after.each(async () => {
  await cleanClientTest()
})

test('shows that core stores are loading', async () => {
  equal(appLoading.get(), true)
  await setTimeout(10)
  equal(appLoading.get(), false)
})

test.run()
