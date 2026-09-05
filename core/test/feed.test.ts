import { deepEqual } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { addFeed, isDemo, needWelcome, testFeed } from '../index.ts'
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

  test('shows the welcome in the demo mode', async () => {
    enableClientTest()
    await addFeed(testFeed())
    await waitFor(needWelcome, welcome => welcome === false)

    isDemo.set(true)
    await waitFor(needWelcome, welcome => welcome === true)
    isDemo.set(false)
  })
})
