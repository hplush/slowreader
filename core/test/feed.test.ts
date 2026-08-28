import { deepEqual } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { needWelcome } from '../index.ts'
import { cleanClientTest, enableClientTest, waitFor } from './utils.ts'

describe('feed', () => {
  afterEach(async () => {
    await cleanClientTest()
  })

  test('waits for the database to know about the welcome', async () => {
    let values: (boolean | undefined)[] = []
    let unbind = needWelcome.subscribe(value => {
      values.push(value)
    })

    enableClientTest()
    await waitFor(needWelcome, welcome => typeof welcome !== 'undefined')
    unbind()

    deepEqual(values, [undefined, true])
  })
})
