import { equal } from 'node:assert'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { URL } from 'node:url'

import { createProxy } from '../index.ts'

function getURL(server: Server): string {
  let port = (server.address() as AddressInfo).port
  return `http://localhost:${port}`
}

let target = createServer(async (req, res) => {
  let parsedUrl = new URL(req.url || '', `http://${req.headers.host}`)
  let queryParams = Object.fromEntries(parsedUrl.searchParams.entries())
  if (queryParams.sleep) {
    await setTimeout(parseInt(queryParams.sleep))
  }

  if (queryParams.big === 'file') {
    res.writeHead(200, {
      'Content-Length': '2000',
      'Content-Type': 'text/text'
    })
    res.end('a'.repeat(2000))
  } else if (queryParams.big === 'stream') {
    res.writeHead(200, {
      'Content-Type': 'text/text'
    })
    res.write('a'.repeat(150))
    await setTimeout(10)
    res.write('a'.repeat(150))
  } else if (queryParams.error) {
    res.writeHead(500)
    res.end('Error')
  } else {
    res.writeHead(200, {
      'Content-Type': 'text/json',
      'Set-Cookie': 'test=1'
    })
    res.end(
      JSON.stringify({
        request: {
          headers: req.headers,
          method: req.method,
          queryParams,
          requestPath: parsedUrl.pathname,
          url: req.url
        },
        response: 'ok'
      })
    )
  }
})
target.listen(31597)

let proxy = createServer(
  createProxy({
    allowLocalhost: true,
    allowsFrom: '^http:\\/\\/test.app',
    maxSize: 100,
    timeout: 100
  })
)
proxy.listen(31598)

let proxyUrl = getURL(proxy)
let targetUrl = getURL(target)

after(() => {
  target.close()
  proxy.close()
})

function request(url: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${proxyUrl}/${url}`, {
    ...opts,
    headers: {
      Origin: 'http://test.app',
      ...opts.headers
    }
  })
}

async function expectBadRequest(
  response: Response,
  message: string
): Promise<void> {
  equal(response.status, 400)
  equal(await response.text(), message)
}

test('works', async () => {
  let response = await request(targetUrl)
  equal(response.status, 200)
  let parsedResponse = await response.json()
  equal(parsedResponse?.response, 'ok')
})

test('has timeout', async () => {
  let response = await request(`${targetUrl}?sleep=500`, {})
  await expectBadRequest(response, 'Timeout')
})

test('transfers query params and path', async () => {
  let response = await request(`${targetUrl}/foo/bar?foo=bar&bar=foo`)
  let parsedResponse = await response.json()
  equal(response.status, 200)
  equal(parsedResponse?.response, 'ok')
  equal(parsedResponse?.request?.requestPath, '/foo/bar')
  equal(parsedResponse?.request?.queryParams?.foo, 'bar')
  equal(parsedResponse?.request?.queryParams?.bar, 'foo')
})

test('can use only GET ', async () => {
  let response = await request(targetUrl, {
    method: 'POST'
  })
  equal(response.status, 405)
  equal(await response.text(), 'Only GET is allowed')
})

test('checks URL', async () => {
  let response1 = await fetch(`${proxyUrl}/bad`, {})
  await expectBadRequest(response1, 'Invalid URL')

  let response2 = await fetch(proxyUrl, {})
  await expectBadRequest(response2, 'Invalid URL')
})

test('can use only HTTP or HTTPS protocols', async () => {
  let response = await fetch(
    `${proxyUrl}/${targetUrl.replace('http', 'ftp')}`,
    {}
  )
  await expectBadRequest(response, 'Only HTTP or HTTPS are supported')
})

test('can not use proxy to query local address', async () => {
  let response = await request(targetUrl.replace('localhost', '127.0.0.1'))
  await expectBadRequest(response, 'IP addresses are not allowed')
})

test('clears cookie headers', async () => {
  let response = await request(targetUrl, {
    headers: { Cookie: 'a=1' }
  })

  equal(response.status, 200)
  equal(response.headers.get('set-cookie'), null)
  let parsedResponse = await response.json()
  equal(parsedResponse?.cookie, undefined)
})

test('checks Origin', async () => {
  let response1 = await request(targetUrl, {
    headers: { Origin: 'http://test.app' }
  })
  equal(response1.status, 200)
  equal(response1.headers.get('access-control-allow-origin'), 'http://test.app')

  let response2 = await request(targetUrl, {
    headers: { Origin: 'anothertest.app' }
  })
  await expectBadRequest(response2, 'Unauthorized Origin')

  let response3 = await fetch(`${proxyUrl}/${targetUrl}`)
  await expectBadRequest(response3, 'Unauthorized Origin')
})

test('sends user IP to destination', async () => {
  let response1 = await request(targetUrl)
  equal(response1.status, 200)
  let json1 = await response1.json()
  equal(json1.request.headers['x-forwarded-for'], '::1')

  let response2 = await request(targetUrl, {
    headers: { 'X-Forwarded-For': '4.4.4.4' }
  })
  equal(response2.status, 200)
  let json2 = await response2.json()
  equal(json2.request.headers['x-forwarded-for'], '4.4.4.4, ::1')
})

test('checks response size', async () => {
  let response1 = await request(targetUrl + '?big=file', {})
  equal(response1.status, 413)
  equal(await response1.text(), 'Response too large')

  let response2 = await request(targetUrl + '?big=stream', {})
  equal(response2.status, 200)
  let body2 = await response2.text()
  equal(body2.length, 150)
})

test('is ready for errors', async () => {
  let response1 = await request(targetUrl + '?error=1', {})
  equal(response1.status, 500)
  equal(await response1.text(), 'Error')
})
