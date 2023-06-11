import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal, throws } from 'uvu/assert'

import {
  checkAndRemoveRequestMock,
  expectRequest,
  mockRequest,
  request,
  setRequestMethod
} from '../index.js'
import { rejects } from '../test/utils.js'

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

  await rejects(
    request('https://two.com'),
    'https://one.com instead of https://two.com'
  )
})

test('is ready for unexpected requests', async () => {
  mockRequest()

  expectRequest('https://one.com').andRespond(200)

  equal((await request('https://one.com')).status, 200)
  await rejects(
    request('https://one.com'),
    'Unexpected request https://one.com'
  )
})

test('marks requests as aborted', async () => {
  mockRequest()
  let reply = expectRequest('https://one.com').andWait()

  let aborted = ''
  let controller = new AbortController()
  request('https://one.com', { signal: controller.signal }).catch(e => {
    if (e instanceof Error) aborted = e.name
  })

  controller.abort()
  await setTimeout(10)
  equal(aborted, 'AbortError')
  equal(reply.aborted, true)
})

test.run()
