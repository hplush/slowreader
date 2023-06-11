import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  checkAndRemoveRequestMock,
  createDownloadTask,
  expectRequest,
  mockRequest
} from '../index.js'

test.before.each(() => {
  mockRequest()
})

test.after.each(() => {
  checkAndRemoveRequestMock()
})

test('makes requests', async () => {
  let task = createDownloadTask()

  expectRequest('https://example.com').andRespond(200, 'Hi')
  let response = await task.request('https://example.com')

  equal(response.status, 200)
  equal(await response.text(), 'Hi')
})

test('aborts requests', async () => {
  let task1 = createDownloadTask()
  let task2 = createDownloadTask()
  let calls = ''

  let reply1 = expectRequest('https://one.com').andWait()
  task1
    .request('https://one.com')
    .then(() => {
      calls += '1:ok '
    })
    .catch(e => {
      calls += `1:${e.name} `
    })

  let reply2 = expectRequest('https://two.com').andWait()
  task1
    .request('https://two.com')
    .then(() => {
      calls += '2:ok '
    })
    .catch(e => {
      calls += `2:${e.name} `
    })

  expectRequest('https://three.com').andWait()
  task1
    .request('https://three.com')
    .then(() => {
      calls += '3:ok '
    })
    .catch(e => {
      calls += `3:${e.name} `
    })

  let reply4 = expectRequest('https://four.com').andWait()
  task2
    .request('https://four.com')
    .then(() => {
      calls += '4:ok '
    })
    .catch(e => {
      calls += `4:${e.name} `
    })

  equal(calls, '')

  reply1(200)
  await setTimeout(10)
  equal(calls, '1:ok ')

  task1.abortAll()
  await setTimeout(10)
  equal(calls, '1:ok 2:AbortError 3:AbortError ')

  reply2(200)
  reply4(200)
  await setTimeout(10)
  equal(calls, '1:ok 2:AbortError 3:AbortError 4:ok ')
})

test.run()
