import './dom-parser.ts'

import { equal, rejects, throws } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  checkAndRemoveRequestMock,
  createDownloadTask,
  createTextResponse,
  EncodeType,
  expectRequest,
  ignoreAbortError,
  mockRequest,
  setRequestMethod
} from '../index.ts'

beforeEach(() => {
  mockRequest()
})

afterEach(() => {
  checkAndRemoveRequestMock()
})

test('makes requests', async () => {
  let task = createDownloadTask()

  expectRequest('https://example.com').andRespond(200, 'Hi')
  let response = await task.request('https://example.com')

  equal(response.status, 200)
  equal(response.redirected, false)
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
  await rejects(response2, (e: Error) => e.name === 'AbortError')
})

for (let encodeType of Object.values(EncodeType)) {
  test(`detect ${encodeType} encode type`, async () => {
    let task = createDownloadTask()

    expectRequest('https://example.com').andRespond(200, 'Hi', `text/plain; charset=${encodeType}`)
    let response1 = await task.text('https://example.com')

    equal(response1.ok, true)
    equal(response1.status, 200)
    equal(response1.url, 'https://example.com')
    equal(response1.text, 'Hi')
  })
}

test('parses XML content', async () => {
  let text = createTextResponse('<html><body>Test</body></html>')
  equal(text.parseXml()!.firstChild?.lastChild?.nodeName, 'BODY')
  equal(text.parseXml()!.firstChild?.lastChild?.textContent, 'Test')

  let charset = createTextResponse('<html><body>Test</body></html>', {
    headers: new Headers({ 'content-type': 'text/html;charset=UTF-8' })
  })
  equal(charset.parseXml()!.firstChild?.lastChild?.textContent, 'Test')

  let simple = createTextResponse('<test></test>', {
    headers: new Headers({ 'content-type': 'application/xml' })
  })
  equal(simple.parseXml()!.firstChild?.nodeName, 'test')

  let rss = createTextResponse('<rss></rss>', {
    headers: new Headers({ 'content-type': 'application/rss+xml' })
  })
  equal(rss.parseXml()!.firstChild?.nodeName, 'rss')

  let image = createTextResponse('<jpeg></jpeg>', {
    headers: new Headers({ 'content-type': 'image/jpeg' })
  })
  equal(image.parseXml(), null)

  let json = createTextResponse('{}', {
    headers: new Headers({ 'content-type': 'application/json' })
  })
  equal(json.parseXml(), null)

  let broken = createTextResponse('<test', {
    headers: new Headers({ 'content-type': 'application/xml' })
  })
  equal(broken.parseXml()!.textContent, null)
})

test('parses JSON content', async () => {
  let json = createTextResponse('{ "version": "1.1", "title": "test_title" }', {
    headers: new Headers({ 'content-type': 'application/json' })
  })

  equal((json.parseJson() as { title: string; version: string }).version, '1.1')

  let brokenJson = createTextResponse(
    '{ "items": [], "version": 1.1", "title": "test_title" }',
    {
      headers: new Headers({ 'content-type': 'application/json' })
    }
  )
  equal(brokenJson.parseJson(), null)
})

test('has helper to ignore abort errors', async () => {
  let task = createDownloadTask()

  task.abortAll()

  let error1 = new Error('Test')
  throws(() => {
    try {
      throw error1
    } catch (e) {
      ignoreAbortError(e)
    }
  }, error1)

  let error2 = 'message'
  throws(
    () => {
      try {
        throw error2
      } catch (e) {
        ignoreAbortError(e)
      }
    },
    e => e === error2
  )

  let error3: any
  expectRequest('https://example.com').andRespond(400)
  task.text('https://example.com').catch(e => {
    error3 = e
  })
  task.abortAll()
  await setTimeout(10)

  ignoreAbortError(error3)
})

test('detects content type', async () => {
  equal(
    createTextResponse('custom', {
      headers: new Headers({ 'content-type': 'application/custom' })
    }).contentType,
    'application/custom'
  )
  equal(
    createTextResponse('custom', {
      headers: new Headers({
        'content-type': 'text/plain; charset=utf-8'
      })
    }).contentType,
    'text/plain'
  )
  equal(
    createTextResponse('<html></html>', {
      headers: new Headers({ 'content-type': 'text/html' })
    }).contentType,
    'text/html'
  )
  equal(
    createTextResponse('<html></html>', {
      headers: new Headers({ 'content-type': 'text/plain' })
    }).contentType,
    'text/html'
  )
  equal(createTextResponse('<!DOCTYPE html>body').contentType, 'text/html')
  equal(
    createTextResponse('{"version":"https://jsonfeed.org/version/1"}')
      .contentType,
    'application/json'
  )
  equal(createTextResponse('<rss></rss>').contentType, 'application/rss+xml')
  equal(createTextResponse('<feed></feed>').contentType, 'application/atom+xml')
  equal(
    createTextResponse('<rss><![CDATA[<!DOCTYPE html><html></html>]]></rss>')
      .contentType,
    'application/rss+xml'
  )
})
