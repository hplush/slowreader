import { createProxy } from '@slowreader/proxy'
import { deepEqual, equal } from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, describe, test } from 'node:test'

import { proxyDebug, request, setProxyAsRequestMethod } from '../request.ts'

function getURL(server: Server): string {
  let port = (server.address() as AddressInfo).port
  return `http://localhost:${port}`
}

let target = createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'X-Custom': 'value'
  })
  res.end('hello')
})
await new Promise<void>(resolve => target.listen(0, resolve))

let proxy = createServer(
  createProxy({
    allowUnsafeDestinations: true,
    allowsFrom: '^http://test\\.app',
    bodyTimeout: 10000,
    maxSize: 10 * 1024 * 1024,
    requestTimeout: 10000
  })
)
await new Promise<void>(resolve => proxy.listen(0, resolve))

let proxyUrl = getURL(proxy)
let targetUrl = getURL(target)

after(() => {
  target.close()
  proxy.close()
})

let origin = { Origin: 'http://test.app' }

describe('proxy', () => {
  test('routes requests through proxy', async () => {
    setProxyAsRequestMethod(proxyUrl + '/')
    let response = await request(targetUrl, { headers: origin })
    equal(response.status, 200)
    equal(await response.text(), 'hello')
    equal(response.url, targetUrl)
  })

  test('sends debug headers when proxyDebug is set', async () => {
    setProxyAsRequestMethod(proxyUrl + '/')
    let captured: Headers
    proxyDebug.set(headers => {
      captured = headers
    })
    let response = await request(targetUrl, { headers: origin })
    equal(response.status, 200)
    deepEqual(captured!.get('content-type'), 'text/plain')
    proxyDebug.set(false)
  })
})
