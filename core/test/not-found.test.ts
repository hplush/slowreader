import { LoguxUndoError } from '@logux/client'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { notFound } from '../index.js'
import {
  cleanClientTest,
  enableClientTest,
  setBaseRoute,
  testRouter
} from './utils.js'

let listener: (e: { reason: Error }) => void

beforeEach(() => {
  enableClientTest({
    baseRouter: testRouter,
    errorEvents: {
      addEventListener(event, cb) {
        listener = cb
      }
    }
  })
})

afterEach(async () => {
  await cleanClientTest()
})

test('listens for not found error', async () => {
  setBaseRoute({ params: { feed: 'unknown' }, route: 'categories' })
  equal(notFound.get(), false)

  listener({
    reason: new LoguxUndoError({
      action: { channel: 'feeds/unknown', type: 'logux/subscribe' },
      id: '1 1:0:0 0',
      reason: 'notFound',
      type: 'logux/undo'
    })
  })
  equal(notFound.get(), true)

  setBaseRoute({ params: { feed: 'another' }, route: 'categories' })
  equal(notFound.get(), false)
})
