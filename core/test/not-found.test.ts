import { LoguxUndoError } from '@logux/client'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { notFound, NotFoundError, setBaseTestRoute } from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

let listener: (e: { reason: Error }) => void

beforeEach(() => {
  enableClientTest({
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

test('listens for not found error', () => {
  setBaseTestRoute({ params: { feed: 'unknown' }, route: 'categories' })
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

  setBaseTestRoute({ params: { feed: 'another' }, route: 'categories' })
  equal(notFound.get(), false)

  listener({
    reason: new NotFoundError()
  })
  equal(notFound.get(), true)
})
