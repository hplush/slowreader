import { LoguxUndoError } from '@logux/client'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import {
  errorToMessage,
  fatal,
  getIssueURL,
  getUnhandledErrors,
  HTTPStatusError,
  NotFoundError
} from '../errors.ts'
import { commonMessages } from '../messages/index.ts'
import { cleanClient, startClient, openRoute } from './utils.ts'

describe('errors', () => {
  afterEach(async () => {
    await cleanClient()
  })

  function listenErrors(): Record<
    'error' | 'unhandledrejection',
    (event: { error?: unknown; message?: string; reason?: unknown }) => void
  > {
    let listeners = {} as ReturnType<typeof listenErrors>
    startClient({
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

    openRoute({
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

    openRoute({
      params: { feed: 'another' },
      route: 'feedsByCategories'
    })
    equal(fatal.get(), undefined)

    listener({
      reason: new NotFoundError()
    })
    deepEqual(fatal.get(), { type: 'notFound' })
  })

  test('checks HTTP error status', () => {
    let error = new HTTPStatusError(502, 'https://a.com/', '', new Headers())
    equal(HTTPStatusError.is(error), true)
    equal(HTTPStatusError.is(error, [404, 502]), true)
    equal(HTTPStatusError.is(error, [404]), false)
    equal(HTTPStatusError.is(error, /^5\d\d$/), true)
    equal(HTTPStatusError.is(error, /^4\d\d$/), false)
    equal(HTTPStatusError.is(new Error('502')), false)
  })

  test('converts HTTP errors to messages', () => {
    startClient()
    function message(status: number, response: string): string {
      return errorToMessage(
        new HTTPStatusError(status, 'https://a.com/', response, new Headers())
      )
    }
    equal(message(400, 'bad feed id'), 'Bad feed id')
    equal(message(400, '<html>'), commonMessages.get().error400)
    equal(
      message(401, '{"error":"Unauthorized: token not supplied"}'),
      commonMessages.get().error401
    )
    equal(message(404, ''), commonMessages.get().error404)
    equal(message(503, 'x'), commonMessages.get().error5xx)
    equal(message(418, 'x'), 'Feed server error: 418')
  })

  test('converts full disk error to message', () => {
    startClient()
    equal(
      errorToMessage(new DOMException('', 'QuotaExceededError')),
      commonMessages.get().quotaError
    )
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

test('builds GitHub issue URL with debug info', () => {
  let url = new URL(getIssueURL('The app crashed', 'Error: test'))
  equal(
    url.origin + url.pathname,
    'https://github.com/hplush/slowreader/issues/new'
  )
  equal(url.searchParams.get('title'), 'The app crashed')
  equal(
    url.searchParams.get('body'),
    '```\nError: test\n```\n\n> What was your step before the error?\n\n'
  )
})
