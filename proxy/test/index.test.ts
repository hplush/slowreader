import { deepStrictEqual, equal, match, ok, rejects } from 'node:assert/strict'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo, Socket } from 'node:net'
import { after, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { URL } from 'node:url'
import { gzipSync } from 'node:zlib'

import { createProxy } from '../index.ts'

describe('proxy', () => {
  interface EchoResponse {
    request: {
      headers: IncomingHttpHeaders
      method: string
      queryParams: Record<string, string>
      requestPath: string
      url: string
    }
    response: string
  }

  function getURL(server: Server): string {
    let port = (server.address() as AddressInfo).port
    return `http://localhost:${port}`
  }

  let inFlight = 0
  let maxInFlight = 0
  let requests = 0
  let sockets = new WeakSet<Socket>()

  let target = createServer(async (req, res) => {
    inFlight += 1
    requests += 1
    let reused = sockets.has(req.socket)
    sockets.add(req.socket)
    if (inFlight > maxInFlight) maxInFlight = inFlight
    res.on('close', () => {
      inFlight -= 1
    })

    let parsedUrl = new URL(req.url!, `http://${req.headers.host}`)
    let queryParams = Object.fromEntries(parsedUrl.searchParams.entries())
    if (queryParams.sleep) {
      await setTimeout(parseInt(queryParams.sleep))
    }

    if (queryParams.drop || (queryParams.reset && reused)) {
      req.socket.destroy()
    } else if (queryParams.stall) {
      res.writeHead(200)
      res.write('a')
      await setTimeout(parseInt(queryParams.stall))
      res.end('b')
    } else if (queryParams.redirectTo) {
      res.writeHead(302, { Location: queryParams.redirectTo })
      res.end()
    } else if (queryParams.emptyHost) {
      res.writeHead(302, { Location: 'http:///?redirected=1' })
      res.end()
    } else if (queryParams.loop) {
      res.writeHead(302, { Location: '/?loop=1' })
      res.end()
    } else if (queryParams.big === 'file') {
      res.writeHead(200, {
        'Content-Length': '2000',
        'Content-Type': 'text/text'
      })
      res.end('a'.repeat(2000))
    } else if (queryParams.gzip) {
      res.writeHead(200, {
        'Content-Encoding': 'gzip',
        'Content-Type': 'text/plain'
      })
      res.end(gzipSync('gzipped content'))
    } else if (queryParams.size) {
      res.writeHead(200, { 'Cache-Control': 'max-age=60' })
      let total = parseInt(queryParams.size)
      for (let sent = 0; sent < total; sent += 100) {
        if (res.destroyed) return
        res.write('a'.repeat(Math.min(100, total - sent)))
        await setTimeout(parseInt(queryParams.pace ?? '1'))
      }
      res.end()
    } else if (queryParams.rateLimit) {
      let headers: Record<string, string> = {}
      if (queryParams.retryAfter) {
        headers['Retry-After'] = queryParams.retryAfter
      }
      res.writeHead(429, headers)
      res.end('Too Many Requests')
    } else if (queryParams.error) {
      res.writeHead(500)
      res.end('Error')
    } else {
      let headers: Record<string, string> = {
        'Content-Type': 'text/json',
        'Set-Cookie': 'test=1'
      }
      if (queryParams.cacheControl) {
        headers['Cache-Control'] = queryParams.cacheControl
      }
      if (queryParams.lastModified) {
        headers['Last-Modified'] = queryParams.lastModified
        let since = req.headers['if-modified-since']
        if (since && new Date(since) >= new Date(queryParams.lastModified)) {
          res.writeHead(304, headers)
          res.end()
          return
        }
      }
      res.writeHead(200, headers)
      res.end(
        JSON.stringify({
          request: {
            headers: req.headers,
            method: req.method!,
            queryParams,
            requestPath: parsedUrl.pathname,
            url: req.url!
          },
          response: 'content'
        } satisfies EchoResponse)
      )
    }
  })
  target.listen(31597)

  let proxy = createServer(
    createProxy({
      allowUnsafeDestinations: true,
      allowsFrom: '^http:\\/\\/test.app',
      bodyTimeout: 1000,
      cacheSize: 1024,
      dnsCacheTime: 60000,
      hostDelay: 0,
      ipLimit: 10000,
      ipWindow: 60000,
      maxRequests: 100,
      maxSize: 1500,
      requestTimeout: 1000
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
    message: string,
    status = 400
  ): Promise<void> {
    equal(response.status, status)
    equal(await response.text(), message + '\n')
  }

  test('has health check', async () => {
    let response = await fetch(`${proxyUrl}/health`)
    equal(response.status, 200)
    equal(await response.text(), 'OK\n')
  })

  test('has timeout', async () => {
    let response = await request(`${targetUrl}?sleep=2000`, {})
    await expectBadRequest(response, 'Timeout')
  })

  test('waits for slow body while it moves', async () => {
    let response = await request(`${targetUrl}?size=1200&pace=300`)
    equal(response.status, 200)
    equal((await response.text()).length, 1200)
  })

  test('cuts stalled body', async () => {
    let response = await request(`${targetUrl}?stall=1500`)
    equal(response.status, 200)
    await rejects(response.text())
  })

  test('retries request on closed kept-alive connection', async () => {
    await (await request(`${targetUrl}?test=warm`)).text()
    requests = 0
    let response = await request(`${targetUrl}?reset=1`)
    equal(response.status, 200)
    equal(((await response.json()) as EchoResponse).response, 'content')
    equal(requests, 2)

    response = await request(`${targetUrl}?drop=1`)
    await expectBadRequest(response, 'socket hang up')
  })

  test('transfers query params and path', async () => {
    let response = await request(`${targetUrl}/foo/bar?foo=bar&bar=foo`)
    let parsedResponse = (await response.json()) as EchoResponse
    equal(response.status, 200)
    equal(parsedResponse.response, 'content')
    equal(parsedResponse.request.requestPath, '/foo/bar')
    equal(parsedResponse.request.queryParams.foo, 'bar')
    equal(parsedResponse.request.queryParams.bar, 'foo')
  })

  test('can use only GET ', async () => {
    let response = await request(targetUrl, {
      method: 'POST'
    })
    expectBadRequest(response, 'Only GET is allowed', 405)
  })

  test('checks URL', async () => {
    let response1 = await request('bad')
    await expectBadRequest(response1, 'Invalid URL')

    let response2 = await request('')
    await expectBadRequest(response2, 'Invalid URL')
  })

  test('follows redirects', async () => {
    let response = await request(
      `${targetUrl}?redirectTo=${encodeURIComponent(`${targetUrl}/final?redirected=1`)}`
    )
    let parsedResponse = (await response.json()) as EchoResponse
    equal(response.status, 200)
    equal(parsedResponse.request.requestPath, '/final')
    equal(parsedResponse.request.queryParams.redirected, '1')
  })

  test('fixes redirects with empty host', async () => {
    let response = await request(`${targetUrl}?emptyHost=1`)
    let parsedResponse = (await response.json()) as EchoResponse
    equal(response.status, 200)
    equal(parsedResponse.request.queryParams.redirected, '1')
  })

  test('stops redirect loops', async () => {
    let response = await request(`${targetUrl}?loop=1`)
    await expectBadRequest(response, 'Too many redirects')
  })

  test('checks redirect destination', async () => {
    let response = await request(
      `${targetUrl}?redirectTo=${encodeURIComponent('ftp://example.com/feed')}`
    )
    await expectBadRequest(response, 'Only HTTP or HTTPS are supported')
  })

  test('can use only HTTP or HTTPS protocols', async () => {
    let response = await request(targetUrl.replace('http', 'ftp'))
    await expectBadRequest(response, 'Only HTTP or HTTPS are supported')
  })

  test('can not use localhost or IP without a setting', async () => {
    await using otherProxy = createServer(
      createProxy({
        allowsFrom: '^http:\\/\\/test.app',
        bodyTimeout: 100,
        cacheSize: 1024,
        dnsCacheTime: 60000,
        hostDelay: 0,
        ipLimit: 10000,
        ipWindow: 60000,
        maxRequests: 100,
        maxSize: 1500,
        requestTimeout: 100
      })
    )
    await new Promise<void>(resolve => {
      otherProxy.listen(31599, resolve)
    })
    let response1 = await fetch(`${getURL(otherProxy)}/${targetUrl}`, {
      headers: {
        Origin: 'http://test.app'
      }
    })
    await expectBadRequest(
      response1,
      'IP addresses or local domains are not allowed'
    )

    let response2 = await fetch(
      `${getURL(otherProxy)}/${targetUrl.replace('localhost', '127.0.0.1')}`,
      {
        headers: {
          Origin: 'http://test.app'
        }
      }
    )
    await expectBadRequest(
      response2,
      'IP addresses or local domains are not allowed'
    )

    let response3 = await fetch(`${getURL(otherProxy)}/http://google}`, {
      headers: {
        Origin: 'http://test.app'
      }
    })
    equal(response3.status, 400)
    match(await response3.text(), /ENOTFOUND|EAI_AGAIN/)

    let response4 = await fetch(`${getURL(otherProxy)}/http://[::1]:31597/`, {
      headers: {
        Origin: 'http://test.app'
      }
    })
    await expectBadRequest(
      response4,
      'IP addresses or local domains are not allowed'
    )

    let response5 = await fetch(`${getURL(otherProxy)}/http://foo.local/feed`, {
      headers: {
        Origin: 'http://test.app'
      }
    })
    await expectBadRequest(
      response5,
      'IP addresses or local domains are not allowed'
    )

    let response6 = await fetch(
      `${getURL(otherProxy)}/http://api.internal/feed`,
      {
        headers: {
          Origin: 'http://test.app'
        }
      }
    )
    await expectBadRequest(
      response6,
      'IP addresses or local domains are not allowed'
    )

    let response7 = await fetch(
      `${getURL(otherProxy)}/http://app.localhost/feed`,
      {
        headers: {
          Origin: 'http://test.app'
        }
      }
    )
    await expectBadRequest(
      response7,
      'IP addresses or local domains are not allowed'
    )

    let response8 = await fetch(
      `${getURL(otherProxy)}/http://localhost./feed`,
      {
        headers: {
          Origin: 'http://test.app'
        }
      }
    )
    await expectBadRequest(
      response8,
      'IP addresses or local domains are not allowed'
    )
  })

  test('cleans request headers', async () => {
    let response = await request(targetUrl, {
      headers: {
        'Accept-Language': 'ru-RU',
        'Cookie': 'a=1',
        'User-Agent': 'Mozilla/5.0 Chrome/140'
      }
    })

    equal(response.status, 200)
    equal(response.headers.get('set-cookie'), null)
    let parsedResponse = (await response.json()) as EchoResponse
    equal(parsedResponse.request.headers.cookie, undefined)
    equal(parsedResponse.request.headers['accept-language'], undefined)
    equal(
      parsedResponse.request.headers['user-agent'],
      'SlowReader/1.0 (+https://slowreader.app)'
    )
  })

  test('checks Origin', async () => {
    let options = await fetch(`${proxyUrl}/${targetUrl}`, {
      headers: {
        Origin: 'http://test.app'
      },
      method: 'OPTIONS'
    })
    equal(options.status, 204)
    equal(options.headers.get('access-control-allow-origin'), 'http://test.app')

    let response1 = await request(targetUrl, {
      headers: { Origin: 'http://test.app' }
    })
    equal(response1.status, 200)
    equal(
      response1.headers.get('access-control-allow-origin'),
      'http://test.app'
    )

    let response2 = await request(targetUrl, {
      headers: { Origin: 'anothertest.app' }
    })
    await expectBadRequest(
      response2,
      'Unauthorized Origin. Only /^http:\\/\\/test.app/ is allowed.'
    )

    let response3 = await fetch(`${proxyUrl}/${targetUrl}`)
    await expectBadRequest(
      response3,
      'Unauthorized Origin. Only /^http:\\/\\/test.app/ is allowed.'
    )
    let referer = await fetch(`${proxyUrl}/${targetUrl}`, {
      headers: {
        Referer: 'http://test.app/page'
      }
    })
    equal(referer.status, 200)
    equal(referer.headers.get('access-control-allow-origin'), null)

    let error = await request(targetUrl + '?big=file', {})
    equal(error.status, 413)
    equal(error.headers.get('access-control-allow-origin'), 'http://test.app')
  })

  test('hides user IP from destination', async () => {
    let response = await request(targetUrl, {
      headers: { 'X-Forwarded-For': '4.4.4.4', 'X-Real-IP': '5.5.5.5' }
    })

    equal(response.status, 200)
    let parsedResponse = (await response.json()) as EchoResponse
    equal(parsedResponse.request.headers['x-forwarded-for'], undefined)
    equal(parsedResponse.request.headers['x-real-ip'], undefined)
  })

  test('loads one URL per host at a time', async () => {
    await using otherProxy = createServer(
      createProxy({
        allowUnsafeDestinations: true,
        allowsFrom: '^http:\\/\\/test.app',
        bodyTimeout: 1000,
        cacheSize: 1024,
        dnsCacheTime: 60000,
        hostDelay: 50,
        ipLimit: 10000,
        ipWindow: 60000,
        maxRequests: 100,
        maxSize: 1500,
        requestTimeout: 1000
      })
    )
    await new Promise<void>(resolve => {
      otherProxy.listen(31600, resolve)
    })

    maxInFlight = 0
    let started = Date.now()
    let responses = await Promise.all(
      [1, 2, 3].map(i => {
        return fetch(`${getURL(otherProxy)}/${targetUrl}?sleep=50&i=${i}`, {
          headers: { Origin: 'http://test.app' }
        })
      })
    )

    equal(maxInFlight, 1)
    for (let response of responses) equal(response.status, 200)
    ok(Date.now() - started >= 3 * 50 + 2 * 50)
  })

  test('passes rate limit headers to client', async () => {
    let response = await request(`${targetUrl}?rateLimit=1&retryAfter=5`)
    equal(response.status, 429)
    equal(response.headers.get('retry-after'), '5')
    match(response.headers.get('access-control-expose-headers')!, /Retry-After/)

    let withoutHeader = await request(`${targetUrl}?rateLimit=1`)
    equal(withoutHeader.status, 429)
    equal(withoutHeader.headers.get('retry-after'), null)
  })

  test('caches responses by Cache-Control', async () => {
    requests = 0
    let url = `${targetUrl}?cacheControl=max-age=60&test=cache`
    let first = await request(url)
    equal(first.status, 200)
    equal(((await first.json()) as EchoResponse).response, 'content')

    let second = await request(url)
    equal(second.status, 200)
    equal(((await second.json()) as EchoResponse).response, 'content')
    equal(requests, 1)

    for (let control of ['no-store', 'public']) {
      requests = 0
      let notCached = `${targetUrl}?cacheControl=${control}&test=${control}`
      await (await request(notCached)).json()
      await (await request(notCached)).json()
      equal(requests, 2)
    }
  })

  test('answers 304 from cache', async () => {
    let lastModified = new Date(Date.now() - 10e3).toUTCString()
    let url = `${targetUrl}?cacheControl=max-age=60&lastModified=${lastModified}`

    requests = 0
    let first = await request(url)
    equal(first.status, 200)
    await first.json()

    let second = await request(url, {
      headers: { 'If-Modified-Since': new Date().toUTCString() }
    })
    equal(second.status, 304)
    equal(requests, 1)
  })

  test('forgets too big and too old cache entries', async () => {
    requests = 0
    await (await request(`${targetUrl}?size=1200`)).text()
    await (await request(`${targetUrl}?size=1200`)).text()
    equal(requests, 2)

    await (await request(`${targetUrl}?size=600&test=first`)).text()
    await (await request(`${targetUrl}?size=600&test=second`)).text()
    requests = 0
    await (await request(`${targetUrl}?size=600&test=first`)).text()
    equal(requests, 1)

    let expiring = `${targetUrl}?cacheControl=max-age=1&test=expires`
    await (await request(expiring)).json()
    await setTimeout(1100)
    requests = 0
    await (await request(expiring)).json()
    equal(requests, 1)
  })

  test('limits response size while streaming', async () => {
    let response = await request(`${targetUrl}?size=5000`)
    equal(response.status, 200)
    await rejects(response.text())
  })

  test('protects clients from proxied HTML', async () => {
    let response = await request(targetUrl)
    equal(response.headers.get('x-content-type-options'), 'nosniff')
    equal(response.headers.get('content-security-policy'), 'sandbox')
    await response.json()
  })

  test('limits requests per IP', async () => {
    await using otherProxy = createServer(
      createProxy({
        allowUnsafeDestinations: true,
        allowsFrom: '^http:\\/\\/test.app',
        bodyTimeout: 1000,
        cacheSize: 1024,
        dnsCacheTime: 60000,
        hostDelay: 0,
        ipLimit: 2,
        ipWindow: 100,
        maxRequests: 100,
        maxSize: 1500,
        requestTimeout: 1000
      })
    )
    await new Promise<void>(resolve => {
      otherProxy.listen(31601, resolve)
    })

    async function load(): Promise<number> {
      let response = await fetch(`${getURL(otherProxy)}/${targetUrl}`, {
        headers: { Origin: 'http://test.app' }
      })
      await response.text()
      return response.status
    }

    equal(await load(), 200)
    equal(await load(), 200)
    equal(await load(), 429)

    await setTimeout(150)
    equal(await load(), 200)
  })

  test('takes IP from balancer', async () => {
    await using otherProxy = createServer(
      createProxy({
        allowUnsafeDestinations: true,
        allowsFrom: '^http:\\/\\/test.app',
        behindBalancer: true,
        bodyTimeout: 1000,
        cacheSize: 1024,
        dnsCacheTime: 60000,
        hostDelay: 0,
        ipLimit: 2,
        ipWindow: 60000,
        maxRequests: 100,
        maxSize: 1500,
        requestTimeout: 1000
      })
    )
    await new Promise<void>(resolve => {
      otherProxy.listen(31604, resolve)
    })

    // Balancer appends the real IP to the value, which client sent
    async function load(forwarded: string): Promise<number> {
      let response = await fetch(`${getURL(otherProxy)}/${targetUrl}`, {
        headers: { 'Origin': 'http://test.app', 'X-Forwarded-For': forwarded }
      })
      await response.text()
      return response.status
    }

    equal(await load('1.1.1.1, 2.2.2.2'), 200)
    equal(await load('9.9.9.9, 2.2.2.2'), 200)
    equal(await load('8.8.8.8, 2.2.2.2'), 429)
    equal(await load('1.1.1.1, 3.3.3.3'), 200)
  })

  test('ignores balancer headers without balancer', async () => {
    await using otherProxy = createServer(
      createProxy({
        allowUnsafeDestinations: true,
        allowsFrom: '^http:\\/\\/test.app',
        bodyTimeout: 1000,
        cacheSize: 1024,
        dnsCacheTime: 60000,
        hostDelay: 0,
        ipLimit: 2,
        ipWindow: 60000,
        maxRequests: 100,
        maxSize: 1500,
        requestTimeout: 1000
      })
    )
    await new Promise<void>(resolve => {
      otherProxy.listen(31605, resolve)
    })

    async function load(forwarded: string): Promise<number> {
      let response = await fetch(`${getURL(otherProxy)}/${targetUrl}`, {
        headers: { 'Origin': 'http://test.app', 'X-Forwarded-For': forwarded }
      })
      await response.text()
      return response.status
    }

    equal(await load('1.1.1.1'), 200)
    equal(await load('2.2.2.2'), 200)
    equal(await load('3.3.3.3'), 429)
  })

  test('limits requests in parallel', async () => {
    await using otherProxy = createServer(
      createProxy({
        allowUnsafeDestinations: true,
        allowsFrom: '^http:\\/\\/test.app',
        bodyTimeout: 1000,
        cacheSize: 1024,
        dnsCacheTime: 60000,
        hostDelay: 0,
        ipLimit: 10000,
        ipWindow: 60000,
        maxRequests: 1,
        maxSize: 1500,
        requestTimeout: 1000
      })
    )
    await new Promise<void>(resolve => {
      otherProxy.listen(31602, resolve)
    })

    let statuses = await Promise.all(
      [1, 2].map(async i => {
        let response = await fetch(
          `${getURL(otherProxy)}/${targetUrl}?sleep=200&i=${i}`,
          { headers: { Origin: 'http://test.app' } }
        )
        await response.text()
        return response.status
      })
    )
    deepStrictEqual(
      statuses.toSorted((a, b) => a - b),
      [200, 503]
    )
  })

  test('passes compressed body as is', async () => {
    let response = await request(`${targetUrl}?gzip=1`)
    equal(response.status, 200)
    equal(response.headers.get('content-encoding'), 'gzip')
    equal(await response.text(), 'gzipped content')
  })

  test('reports connection errors', async () => {
    let response = await request('http://missing.invalid/')
    equal(response.status, 400)
    match(await response.text(), /ENOTFOUND|EAI_AGAIN/)
  })

  test('checks response size', async () => {
    let response = await request(targetUrl + '?big=file', {})
    expectBadRequest(response, 'Response too large', 413)
  })

  test('is ready for errors', async () => {
    let response = await request(targetUrl + '?error=1', {})
    equal(response.status, 500)
    equal(await response.text(), 'Error')
  })

  test('passes conditional requests to destination', async () => {
    let lastModified = new Date(Date.now() - 10e3).toUTCString()

    let futureTime = new Date(Date.now() + 20e3).toUTCString()
    let pastTime = new Date(Date.now() - 20e3).toUTCString()

    let response1 = await request(`${targetUrl}?lastModified=${lastModified}`, {
      headers: {
        'If-Modified-Since': futureTime
      }
    })
    equal(response1.status, 304)
    equal(response1.headers.get('last-modified'), lastModified)

    let response2 = await request(`${targetUrl}?lastModified=${lastModified}`, {
      headers: {
        'If-Modified-Since': pastTime
      }
    })
    equal(response2.status, 200)
    let json2 = (await response2.json()) as EchoResponse
    equal(json2.response, 'content')
  })

  test('sends debug headers back ', async () => {
    let response = await request(targetUrl, {
      headers: { 'x-slowreader-debug': '1' }
    })

    equal(response.status, 200)
    equal(
      response.headers.get('Access-Control-Expose-Headers'),
      'Retry-After, RateLimit-Reset, X-Rate-Limit-Reset, ' +
        'x-slowreader-request, x-slowreader-response'
    )
    match(response.headers.get('x-slowreader-request')!, /^GET /)
    match(response.headers.get('x-slowreader-request')!, /host: localhost/)
    match(response.headers.get('x-slowreader-response')!, /^200\\n/)
    match(
      response.headers.get('x-slowreader-response')!,
      /content-type: text\/json/
    )
    equal(((await response.json()) as EchoResponse).response, 'content')
  })
})
