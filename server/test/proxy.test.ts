import { TestServer } from '@logux/server'
import { deepEqual, equal } from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, afterEach, test } from 'node:test'

import proxyModule from '../modules/proxy.ts'

let target = createServer((req, res) => {
  let parsedUrl = new URL(req.url!, `http://${req.headers.host}`)
  res.writeHead(200, {
    'Content-Type': 'text/json',
    'Set-Cookie': 'test=1'
  })
  res.end(
    JSON.stringify({
      request: {
        method: req.method,
        requestPath: parsedUrl.pathname,
        url: req.url
      },
      response: 'ok'
    })
  )
})
target.listen(31597)

function getURL(server: Server): string {
  let port = (server.address() as AddressInfo).port
  return `http://localhost:${port}`
}

let server: TestServer | undefined
let originEnv = { ...process.env }

afterEach(async () => {
  await server?.destroy()
  server = undefined
  process.env = { ...originEnv }
})

after(async () => {
  await new Promise(resolve => {
    target.close(resolve)
  })
})

test('uses proxy', async () => {
  process.env.PROXY_ORIGIN = '^http:\\/\\/test.app$'
  server = new TestServer()
  proxyModule(server, {
    allowLocalhost: true,
    allowsFrom: process.env.PROXY_ORIGIN
  })

  let response = await server.fetch(`/proxy/${getURL(target)}/path`, {
    headers: {
      Origin: 'http://test.app'
    }
  })
  equal(response.status, 200)
  deepEqual(await response.json(), {
    request: {
      method: 'GET',
      requestPath: '/path',
      url: '/path'
    },
    response: 'ok'
  })

  let denied = await server.fetch(`/proxy/${getURL(target)}/path`)
  equal(denied.status, 400)

  let unknown = await server.fetch(`/proxy`)
  equal(unknown.status, 404)
})

test('can be disabled', async () => {
  server = new TestServer()
  proxyModule(server, {
    allowLocalhost: true
  })

  let response = await server.fetch(`/proxy/${getURL(target)}/path`, {
    headers: {
      Origin: 'http://test.app'
    }
  })
  equal(response.status, 404)
})
