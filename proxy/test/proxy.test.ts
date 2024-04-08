import { before, test, describe } from 'node:test'
import { equal } from 'node:assert'
import proxy from '../proxy.js'
import fetch from 'node-fetch'
import { createServer } from 'node:http'
import { initTestHttpServer, getTestHttpServer } from './utils.js'

/**
 * Proxy is tested with a service that outputs request and response data.
 *
 * <local client> -> <proxy> -> <targetServer>
 */
const targetServer = createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/json'
  })

  res.end(
    JSON.stringify({
      response: 'ok',
      request: { headers: req.headers, method: req.method, url: req.url }
    })
  )
})

describe('proxy tests', async () => {
  await initTestHttpServer('proxy', proxy, { port: 3999 })
  await initTestHttpServer('target', targetServer, { port: 4000 })

  let proxyServerUrl = ''
  let targetServerUrl = ''

  before(() => {
    const proxy = getTestHttpServer('proxy')
    if (proxy) {
      proxyServerUrl = proxy.baseUrl
    }

    const target = getTestHttpServer('target')
    if (target) {
      targetServerUrl = target.baseUrl
    }

    if (!target || !proxy) {
      throw new Error(
        "Couldn't set up target server or proxy server. Something is misconfigured. Please check out 'proxy.test.js'"
      )
    }

    console.log(`Proxy server running on ${proxyServerUrl}`)
    console.log(`Target test server running on ${targetServerUrl}`)
  })

  await test('proxy works', async () => {
    const response = await fetch(`${proxyServerUrl}/${targetServerUrl}`)
    const parsedResponse = await response.json()
    // @ts-ignore
    equal(parsedResponse?.response, 'ok')
  })

  await describe('security', async () => {
    await test('can use only GET ', async () => {
      const methods = ['DELETE', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'TRACE']

      for (const method of methods) {
        await test(`can not use ${method}`, async () => {
          const response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
            method
          })
          equal(response.status, 500)
        })
      }
    })

    await describe('cookies', async () => {
      await test('proxy clears set-cookie header', async () => {
        const response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
          headers: { 'set-cookie': 'accessToken=1234abc; userId=1234' }
        })
        const parsedResponse = await response.json()
        // @ts-ignore
        equal(parsedResponse?.['set-cookie'], undefined)
        // @ts-ignore
        equal(parsedResponse?.['cookie'], undefined)
      })

      await test('proxy clears cookie header', async () => {
        const response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
          headers: { cookie: 'accessToken=1234abc; userId=1234' }
        })
        const parsedResponse = await response.json()
        // @ts-ignore
        equal(parsedResponse?.['set-cookie'], undefined)
        // @ts-ignore
        equal(parsedResponse?.cookie, undefined)
      })
    })
  })
})
