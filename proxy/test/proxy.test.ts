import { before, test, describe } from 'node:test'
import { equal } from 'node:assert'
import { createServer } from 'node:http'
import { initTestHttpServer, getTestHttpServer } from './utils.js'
import createProxyServer from '../proxy.js'
import { URL } from 'url'

/**
 * Proxy is tested with a service that outputs request and response data.
 *
 * <local client> -> <proxy> -> <targetServer>
 */
const targetServer = createServer((req, res) => {
  const parsedUrl = new URL(req.url || '', `http://${req.headers.host}`)

  const queryParams = Object.fromEntries(parsedUrl.searchParams.entries())
  const requestPath = parsedUrl.pathname

  res.writeHead(200, {
    'Content-Type': 'text/json'
  })

  res.end(
    JSON.stringify({
      response: 'ok',
      request: {
        headers: req.headers,
        method: req.method,
        url: req.url,
        queryParams,
        requestPath
      }
    })
  )
})

describe('proxy tests', async () => {
  await initTestHttpServer(
    'proxy',
    createProxyServer({ silentMode: true, hostnameWhitelist: ['localhost'] })
  )
  await initTestHttpServer('target', targetServer)

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
  })

  await test('proxy works', async () => {
    const response = await fetch(`${proxyServerUrl}/${targetServerUrl}`)
    const parsedResponse = await response.json()
    // @ts-ignore
    equal(response.status, 200)
    equal(parsedResponse?.response, 'ok')
  })

  await test('proxy transfers query params and path', async () => {
    const response = await fetch(
      `${proxyServerUrl}/${targetServerUrl}/foo/bar?foo=bar&bar=foo`
    )
    const parsedResponse = await response.json()
    // @ts-ignore
    equal(response.status, 200)
    equal(parsedResponse?.response, 'ok')
    equal(parsedResponse?.request?.requestPath, '/foo/bar')
    equal(parsedResponse?.request?.queryParams?.foo, 'bar')
    equal(parsedResponse?.request?.queryParams?.bar, 'foo')
  })

  await describe('security', async () => {
    await test('can use only GET ', async () => {
      const forbiddenMethods = ['DELETE', 'HEAD', 'OPTIONS', 'POST', 'PUT']

      for (const method of forbiddenMethods) {
        await test(`can not use ${method}`, async () => {
          const response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
            method
          })
          equal(response.status, 500)
        })
      }
    })

    await test('can use only http or https protocols', async () => {
      const forbiddenProtocols = [
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

      for (const protocol of forbiddenProtocols) {
        await test(`can not use ${protocol}`, async () => {
          const response = await fetch(
            `${proxyServerUrl}/${targetServerUrl.replace('http', protocol)}`,
            {}
          )
          equal(response.status, 500)
        })
      }
    })

    await test('can not use proxy to query local address', async () => {
      const response = await fetch(
        `${proxyServerUrl}/${targetServerUrl.replace('localhost', '127.0.0.1')}`,
        {}
      )
      equal(response.status, 500)
    })

    await describe('cookies', async () => {
      await test('proxy clears set-cookie header', async () => {
        const response = await fetch(`${proxyServerUrl}/${targetServerUrl}`, {
          headers: { 'set-cookie': 'accessToken=1234abc; userId=1234' }
        })

        equal(response.status, 200)
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

        equal(response.status, 200)
        const parsedResponse = await response.json()
        // @ts-ignore
        equal(parsedResponse?.['set-cookie'], undefined)
        // @ts-ignore
        equal(parsedResponse?.cookie, undefined)
      })
    })
  })
})
