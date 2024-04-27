import { equal } from 'node:assert'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, test } from 'node:test'
import { URL } from 'node:url'

import { createProxyServer } from '../proxy.js'

function getURL(server: Server): string {
  let port = (server.address() as AddressInfo).port
  return `http://localhost:${port}`
}

let target = createServer(async (req, res) => {
  let parsedUrl = new URL(req.url || '', `http://${req.headers.host}`)
  let queryParams = Object.fromEntries(parsedUrl.searchParams.entries())
  if (queryParams.sleep) {
    await new Promise(resolve =>
      setTimeout(resolve, parseInt(queryParams.sleep || '0'))
    )
  }

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
})
target.listen(0)

let proxy = createProxyServer({
  allowsFrom: 'test.app',
  silent: true,
  timeout: 100
})
proxy.listen(0)

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

test('works', async () => {
  let response = await request(targetUrl)
  equal(response.status, 200)
  let parsedResponse = await response.json()
  equal(parsedResponse?.response, 'ok')
})

test('has timeout', async () => {
  let response = await request(`${targetUrl}?sleep=500`, {})
  equal(response.status, 400)
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
  equal(response.status, 400)
})

test('can use only HTTP or HTTPS protocols', async () => {
  let response = await fetch(
    `${proxyUrl}/${targetUrl.replace('http', 'ftp')}`,
    {}
  )
  equal(response.status, 400)
})

test('can not use proxy to query local address', async () => {
  let response = await fetch(
    `${proxyUrl}/${targetUrl.replace('localhost', '127.0.0.1')}`,
    {}
  )
  equal(response.status, 400)
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
    headers: { Origin: 'dev.test.app' }
  })
  equal(response1.status, 200)

  let response2 = await request(targetUrl, {
    headers: { Origin: 'anothertest.app' }
  })
  equal(response2.status, 400)
})
