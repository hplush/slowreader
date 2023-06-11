import { test } from 'uvu'
import { equal, match, throws, unreachable } from 'uvu/assert'

import {
  checkAndRemoveRequestMock,
  expectRequest,
  mockRequest,
  request,
  setRequestMethod
} from '../index.js'

test.after.each(() => {
  setRequestMethod(fetch)
})

test('replaces request method', () => {
  let calls: string[] = []
  setRequestMethod(url => {
    if (typeof url === 'string') {
      calls.push(url)
    }
    return 'result' as any
  })

  equal(request('https://example.com'), 'result')
  equal(calls, ['https://example.com'])
})

test('checks that all mock requests was called', async () => {
  mockRequest()

  expectRequest('https://one.com').andRespond(200)
  expectRequest('https://two.com').andRespond(200)

  equal((await request('https://one.com')).status, 200)
  throws(() => {
    checkAndRemoveRequestMock()
  }, /didn’t send requests: https:\/\/two.com/)
})

test('checks mocks order', async () => {
  mockRequest()

  expectRequest('https://one.com').andRespond(200)
  expectRequest('https://two.com').andRespond(200)

  try {
    await request('https://two.com')
    unreachable()
  } catch (err) {
    if (!(err instanceof Error)) throw err
    match(err.message, 'https://one.com instead of https://two.com')
  }
})

test('is ready for unexpected requests', async () => {
  mockRequest()

  expectRequest('https://one.com').andRespond(200)

  equal((await request('https://one.com')).status, 200)
  try {
    await request('https://two.com')
    unreachable()
  } catch (err) {
    if (!(err instanceof Error)) throw err
    match(err.message, 'Unexpected request https://two.com')
  }
})

test.run()
