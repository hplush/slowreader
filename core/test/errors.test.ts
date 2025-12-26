import { LoguxUndoError } from '@logux/client'
import { equal } from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { notFound, NotFoundError } from '../errors.ts'
import { cleanClientTest, enableClientTest, setBaseTestRoute } from './utils.ts'

afterEach(async () => {
  await cleanClientTest()
})

test('listens for not found error', () => {
  let listener: (e: { reason: Error }) => undefined | void
  enableClientTest({
    errorEvents: {
      addEventListener(event, cb) {
        listener = cb
      }
    }
  })

  setBaseTestRoute({ params: { feed: 'unknown' }, route: 'feedsByCategories' })
  equal(notFound.get(), false)

  listener!({
    reason: new LoguxUndoError({
      action: { channel: 'feeds/unknown', type: 'logux/subscribe' },
      id: '1 1:0:0 0',
      reason: 'notFound',
      type: 'logux/undo'
    })
  })
  equal(notFound.get(), true)

  setBaseTestRoute({ params: { feed: 'another' }, route: 'feedsByCategories' })
  equal(notFound.get(), false)

  listener!({
    reason: new NotFoundError()
  })
  equal(notFound.get(), true)
})
