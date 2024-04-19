import { equal } from 'node:assert'
import { createServer } from 'node:http'
import { before, describe, test } from 'node:test'
import { URL } from 'node:url'

import { createProxyServer } from '../proxy.js'
import { getTestHttpServer, initTestHttpServer } from './utils.js'

/**
 * Proxy is tested with a service that outputs request and response data.
 *
 * <local client> -> <proxy> -> <targetServer>
 */
const targetServer = createServer((req, res) => {
  let parsedUrl = new URL(req.url || '', `http://${req.headers.host}`)

  let queryParams = Object.fromEntries(parsedUrl.searchParams.entries())
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

describe('proxy tests', async () => {
  await initTestHttpServer(
    'proxy',
    createProxyServer({ hostnameWhitelist: ['localhost'], silentMode: true })
  )
  await initTestHttpServer('target', targetServer)

  let proxyServerUrl = ''
  let targetServerUrl = ''

  before(() => {
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
        "Couldn't set up target server or proxy server. Something is misconfigured. Please check out 'proxy.test.js'"
      )
    }
  })

  await test('proxy works', async () => {
    let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`)
    let parsedResponse = await response.json()
    // @ts-ignore
    equal(response.status, 200)
    equal(parsedResponse?.response, 'ok')
  })

  await test('proxy transfers query params and path', async () => {
    let response = await fetch(
      `${proxyServerUrl}/${targetServerUrl}/foo/bar?foo=bar&bar=foo`
    )
    let parsedResponse = await response.json()
    // @ts-ignore
    equal(response.status, 200)
    equal(parsedResponse?.response, 'ok')
    equal(parsedResponse?.request?.requestPath, '/foo/bar')
    equal(parsedResponse?.request?.queryParams?.foo, 'bar')
    equal(parsedResponse?.request?.queryParams?.bar, 'foo')
  })

  await describe('security', async () => {
    await test('can use only GET ', async () => {
      let forbiddenMethods = ['DELETE', 'HEAD', 'OPTIONS', 'POST', 'PUT']

      for (let method of forbiddenMethods) {
        await test(`can not use ${method}`, async () => {
          let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
            method
          })
          equal(response.status, 500)
        })
      }
    })

    await test('can use only http or https protocols', async () => {
      let forbiddenProtocols = [
        'ssh',
        'ftp',
        'sftp',
        'rdp',
        'arp',
        'smtp',
        'pop3',
        'imap',
        'dns',
        'dhcp',
        'snmp'
      ]

      for (let protocol of forbiddenProtocols) {
        await test(`can not use ${protocol}`, async () => {
          let response = await fetch(
            `${proxyServerUrl}/${targetServerUrl.replace('http', protocol)}`,
            {}
          )
          equal(response.status, 500)
        })
      }
    })

    await test('can not use proxy to query local address', async () => {
      let response = await fetch(
        `${proxyServerUrl}/${targetServerUrl.replace('localhost', '127.0.0.1')}`,
        {}
      )
      equal(response.status, 500)
    })

    await describe('cookies', async () => {
      await test('proxy clears set-cookie header', async () => {
        let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
          headers: { 'set-cookie': 'accessToken=1234abc; userId=1234' }
        })

        equal(response.status, 200)
        let parsedResponse = await response.json()
        // @ts-ignore
        equal(parsedResponse?.['set-cookie'], undefined)
        // @ts-ignore
        equal(parsedResponse?.cookie, undefined)
      })

      await test('proxy clears cookie header', async () => {
        let response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
          headers: { cookie: 'accessToken=1234abc; userId=1234' }
        })

        equal(response.status, 200)
        let parsedResponse = await response.json()
        // @ts-ignore
        equal(parsedResponse?.['set-cookie'], undefined)
        // @ts-ignore
        equal(parsedResponse?.cookie, undefined)
      })
    })
  })
})
