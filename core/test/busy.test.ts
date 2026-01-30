import { equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { busy, busyDuring } from '../index.ts'
import { cleanClientTest } from './utils.ts'

describe('busy', () => {
  afterEach(async () => {
    await cleanClientTest()
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
})
