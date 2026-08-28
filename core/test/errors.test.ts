import { LoguxUndoError } from '@logux/client'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { fatal, NotFoundError } from '../errors.ts'
import { cleanClientTest, enableClientTest, setBaseTestRoute } from './utils.ts'

describe('errors', () => {
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

    setBaseTestRoute({
      params: { feed: 'unknown' },
      route: 'feedsByCategories'
    })
    equal(fatal.get(), undefined)

    listener!({
      reason: new LoguxUndoError({
        action: { channel: 'feeds/unknown', type: 'logux/subscribe' },
        id: '1 1:0:0 0',
        reason: 'notFound',
        type: 'logux/undo'
      })
    })
    deepEqual(fatal.get(), { type: 'notFound' })

    setBaseTestRoute({
      params: { feed: 'another' },
      route: 'feedsByCategories'
    })
    equal(fatal.get(), undefined)

    listener!({
      reason: new NotFoundError()
    })
    deepEqual(fatal.get(), { type: 'notFound' })
  })
})
