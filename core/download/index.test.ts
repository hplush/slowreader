import '../test/dom-parser.js'

import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  checkAndRemoveRequestMock,
  createDownloadTask,
  createTextResponse,
  expectRequest,
  mockRequest,
  setRequestMethod
} from '../index.js'
import { rejects } from '../test/utils.js'

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

  await reply1(200)
  equal(calls, '1:ok ')

  task1.abortAll()
  await setTimeout(10)
  equal(calls, '1:ok 2:AbortError 3:AbortError ')

  reply2(200)
  await reply4(200)
  equal(calls, '1:ok 2:AbortError 3:AbortError 4:ok ')
})

test('can download text by keeping eyes on abort signal', async () => {
  let task = createDownloadTask()

  expectRequest('https://example.com').andRespond(200, 'Hi')
  let response1 = await task.text('https://example.com')

  equal(response1.ok, true)
  equal(response1.status, 200)
  equal(response1.url, 'https://example.com')
  equal(response1.text, 'Hi')

  let sendText: ((text: string) => void) | undefined
  setRequestMethod(async url => {
    return {
      ok: true,
      status: 200,
      text() {
        return new Promise(resolve => {
          sendText = resolve
        })
      },
      url: url.toString()
    } as Response
  })

  let response2 = task.text('https://example.com')
  await setTimeout(10)
  task.abortAll()
  sendText?.('Done')
  await rejects(response2, e => {
    equal(e.name, 'AbortError')
  })
})

test('parses content', async () => {
  let text = createTextResponse('<html><body>Test</body></html>')
  equal(text.parse().firstChild?.lastChild?.nodeName, 'BODY')
  equal(text.parse().firstChild?.lastChild?.textContent, 'Test')

  let simple = createTextResponse('<test></test>', {
    headers: new Headers({ 'content-type': 'application/xml' })
  })
  equal(simple.parse().firstChild?.nodeName, 'test')

  let rss = createTextResponse('<rss></rss>', {
    headers: new Headers({ 'content-type': 'application/rss+xml' })
  })
  equal(rss.parse().firstChild?.nodeName, 'rss')

  let image = createTextResponse('<jpeg></jpeg>', {
    headers: new Headers({ 'content-type': 'image/jpeg' })
  })
  equal(image.parse().textContent, null)

  let broken = createTextResponse('<test', {
    headers: new Headers({ 'content-type': 'application/xml' })
  })
  equal(broken.parse().textContent, null)
})

test.run()
