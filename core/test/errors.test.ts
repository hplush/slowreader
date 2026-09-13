import { LoguxUndoError } from '@logux/client'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import { fatal, getUnhandledErrors, NotFoundError } from '../errors.ts'
import { cleanClientTest, enableClientTest, setBaseTestRoute } from './utils.ts'

describe('errors', () => {
  afterEach(async () => {
    await cleanClientTest()
  })

  function listenErrors(): Record<
    'error' | 'unhandledrejection',
    (event: { error?: unknown; message?: string; reason?: unknown }) => void
  > {
    let listeners = {} as ReturnType<typeof listenErrors>
    enableClientTest({
      errorEvents: {
        addEventListener(event, cb) {
          listeners[event] = cb
        }
      }
    })
    return listeners
  }

  test('listens for not found error', () => {
    let listener = listenErrors().unhandledrejection

    setBaseTestRoute({
      params: { feed: 'unknown' },
      route: 'feedsByCategories'
    })
    equal(fatal.get(), undefined)

    listener({
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

    listener({
      reason: new NotFoundError()
    })
    deepEqual(fatal.get(), { type: 'notFound' })
  })

  test('keeps last unhandled errors for the fatal page', () => {
    let listeners = listenErrors()
    equal(getUnhandledErrors(), undefined)

    listeners.error({ error: new Error('OPFS not available'), message: '' })
    listeners.error({ message: 'Script error.' })
    listeners.unhandledrejection({ reason: 'Worker is dead' })
    equal(
      getUnhandledErrors(),
      'Error: OPFS not available\nScript error.\nWorker is dead'
    )

    for (let i = 1; i <= 5; i++) {
      listeners.unhandledrejection({ reason: new Error(`Error ${i}`) })
    }
    equal(
      getUnhandledErrors(),
      'Error: Error 1\nError: Error 2\nError: Error 3\nError: Error 4\n' +
        'Error: Error 5'
    )

    listenErrors()
    equal(getUnhandledErrors(), undefined)
  })
})
