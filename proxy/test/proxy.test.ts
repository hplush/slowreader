import { equal } from 'node:assert'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { URL } from 'node:url'

import { createProxyServer } from '../proxy.js'
import { getTestHttpServer, initTestHttpServer } from './utils.js'

const targetServer = createServer(async (req, res) => {
  let parsedUrl = new URL(req.url || '', `http://${req.headers.host}`)

  let queryParams = Object.fromEntries(parsedUrl.searchParams.entries())

  if (queryParams.sleep) {
    await new Promise(resolve =>
      setTimeout(resolve, parseInt(queryParams.sleep || '0'))
    )
  }

  let requestPath = parsedUrl.pathname

  res.writeHead(200, {
    'Content-Type': 'text/json'
  })

  res.end(
    JSON.stringify({
      request: {
        headers: req.headers,
        method: req.method,
        queryParams,
        requestPath,
        url: req.url
      },
      response: 'ok'
    })
  )
})

await initTestHttpServer(
  'proxy',
  createProxyServer({
    fetchTimeout: 100,
    hostnameWhitelist: ['localhost'],
    silentMode: true
  })
)

await initTestHttpServer('target', targetServer)

let proxyServerUrl = ''
let targetServerUrl = ''

let proxy = getTestHttpServer('proxy')
if (proxy) {
  proxyServerUrl = proxy.baseUrl
}

let target = getTestHttpServer('target')
if (target) {
  targetServerUrl = target.baseUrl
}

if (!target || !proxy) {
  throw new Error(
    "Couldn't set up target server or proxy server. Please check out 'proxy.test.js'"
  )
}

test('proxy works', async () => {
  let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`)
  let parsedResponse = await response.json()
  equal(response.status, 200)
  equal(parsedResponse?.response, 'ok')
})

test('proxy timeout works', async () => {
  let response = await fetch(
    `${proxyServerUrl}/${targetServerUrl}?sleep=500`,
    {}
  )
  equal(response.status, 400)
})

test('proxy transfers query params and path', async () => {
  let response = await fetch(
    `${proxyServerUrl}/${targetServerUrl}/foo/bar?foo=bar&bar=foo`
  )
  let parsedResponse = await response.json()
  equal(response.status, 200)
  equal(parsedResponse?.response, 'ok')
  equal(parsedResponse?.request?.requestPath, '/foo/bar')
  equal(parsedResponse?.request?.queryParams?.foo, 'bar')
  equal(parsedResponse?.request?.queryParams?.bar, 'foo')
})

test('can use only GET ', async () => {
  let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
    method: 'POST'
  })
  equal(response.status, 400)
})

test('can use only http or https protocols', async () => {
  let response = await fetch(
    `${proxyServerUrl}/${targetServerUrl.replace('http', 'ftp')}`,
    {}
  )
  equal(response.status, 400)
})

test('can not use proxy to query local address', async () => {
  let response = await fetch(
    `${proxyServerUrl}/${targetServerUrl.replace('localhost', '127.0.0.1')}`,
    {}
  )
  equal(response.status, 400)
})

test('proxy clears set-cookie header', async () => {
  let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
    headers: { 'set-cookie': 'accessToken=1234abc; userId=1234' }
  })

  equal(response.status, 200)
  let parsedResponse = await response.json()
  equal(parsedResponse?.['set-cookie'], undefined)
  equal(parsedResponse?.cookie, undefined)
})

test('proxy clears cookie header', async () => {
  let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
    headers: { cookie: 'accessToken=1234abc; userId=1234' }
  })

  equal(response.status, 200)
  let parsedResponse = await response.json()
  equal(parsedResponse?.['set-cookie'], undefined)
  equal(parsedResponse?.cookie, undefined)
})
