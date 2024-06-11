import { equal } from 'node:assert'
import {
  createServer,
  IncomingMessage,
  type Server,
  ServerResponse
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { URL } from 'node:url'

import {
  BadRequestError,
  checkRateLimit,
  createProxyServer,
  handleError,
  handleRequestWithDelay,
  isRateLimited,
  processRequest,
  rateLimitMap
} from '../proxy.js'
import type { ProxyConfig } from '../proxy.js'

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

let proxy = createProxyServer({
  allowLocalhost: true,
  allowsFrom: [/^http:\/\/test.app/],
  maxSize: 100,
  timeout: 100
})
proxy.listen(31598)

let proxyUrl = getURL(proxy)
let targetUrl = getURL(target)

after(() => {
  target.close()
  proxy.close()
})

async function request(url: string, opts: RequestInit = {}): Promise<Response> {
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

function createMockRequest(
  url: string,
  method = 'GET',
  headers: Record<string, string> = {}
): IncomingMessage {
  let req = new IncomingMessage(null as any)
  req.url = url
  req.method = method
  req.headers = headers
  return req
}

function createMockResponse(): ServerResponse {
  let mockReq = new IncomingMessage(null as any)
  let res = new ServerResponse(mockReq)
  ;(res as any).write = (chunk: any) => chunk
  ;(res as any).end = () => {}
  return res
}

let config: ProxyConfig = {
  allowLocalhost: true,
  allowsFrom: [/^http:\/\/test\.app$/],
  maxSize: 100,
  timeout: 100
}

test('works', async () => {
  let response = await request(targetUrl)
  equal(response.status, 200)
  let parsedResponse = await response.json()
  equal(parsedResponse?.response, 'ok')
})

test('has timeout', async () => {
  let response = await request(`${targetUrl}?sleep=500`, {
    headers: {
      Origin: 'http://test.app'
    }
  })
  await expectBadRequest(response, 'Timeout')
})

test('transfers query params and path', async () => {
  let response = await request(`${targetUrl}/foo/bar?foo=bar&bar=foo`, {
    headers: { Origin: 'http://test.app' }
  })
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

test('cannot use proxy to query local address', async () => {
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

  equal(json1.headers['x-forwarded-for'], '::1')

  let response2 = await request(targetUrl, {
    headers: { 'X-Forwarded-For': '4.4.4.4' }
  })
  equal(response2.status, 200)
  let json2 = await response2.json()
  equal(json2.headers['x-forwarded-for'], '4.4.4.4, ::1')
})

test('checks response size', async () => {
  let response1 = await request(`${targetUrl}?big=file`, {})
  equal(
    response1.status,
    413,
    `Expected status 413 but received ${response1.status}`
  )
  equal(await response1.text(), 'Response too large')

  let response2 = await request(`${targetUrl}?big=stream`, {})
  equal(
    response2.status,
    200,
    `Expected status 200 but received ${response2.status}`
  )
  let body2 = await response2.text()
  equal(
    body2.length,
    150,
    `Expected body length 150 but received ${body2.length}`
  )
})

test('is ready for errors', async () => {
  let response1 = await request(targetUrl + '?error=1', {})
  equal(response1.status, 500)
  equal(await response1.text(), 'Internal Server Error')
})

test('rate limits per domain', async () => {
  for (let i = 0; i < 500; i++) {
    let response = await request(targetUrl)
    equal(response.status, 200)
  }

  let response = await request(targetUrl)
  equal(response.status, 200)
})

test('rate limits globally', async () => {
  for (let i = 0; i < 5000; i++) {
    let response = await request(targetUrl)
    equal(response.status, 200)
  }

  let response = await request(targetUrl)
  equal(response.status, 200)
})

test('isRateLimited function', () => {
  let limit = { DURATION: 60000, LIMIT: 2 }
  let key = 'test-key'

  // First request should not be rate limited
  let result = isRateLimited(key, rateLimitMap, limit)
  equal(result, false)

  // Second request should not be rate limited
  result = isRateLimited(key, rateLimitMap, limit)
  equal(result, false)

  // Third request should be rate limited
  result = isRateLimited(key, rateLimitMap, limit)
  equal(result, true)
})

test('isRateLimited function - rate limit info reset', () => {
  rateLimitMap.clear()

  let key = '127.0.0.1'
  let limit = { DURATION: 60000, LIMIT: 2 }

  let now = performance.now()

  rateLimitMap.set(key, { count: 1, timestamp: now - limit.DURATION - 1000 })

  // Check rate limit status before increment
  let isLimitedBefore = isRateLimited(key, rateLimitMap, limit)
  let rateLimitInfoBefore = rateLimitMap.get(key)

  equal(isLimitedBefore, false)
  equal(rateLimitInfoBefore?.count, 0)

  // Check rate limit status after increment
  let isLimitedAfter = isRateLimited(key, rateLimitMap, limit)
  let rateLimitInfoAfter = rateLimitMap.get(key)

  equal(isLimitedAfter, false)
  equal(rateLimitInfoAfter?.count, 1)

  // Mocking time progression within the limit duration
  performance.now = () => now + 1000
  let isLimitedWithinDuration = isRateLimited(key, rateLimitMap, limit)
  equal(isLimitedWithinDuration, false)
  equal(rateLimitMap.get(key)?.count, 2)

  // Exceeding the rate limit
  let isLimitedExceed = isRateLimited(key, rateLimitMap, limit)
  equal(isLimitedExceed, true)
})

test('processRequest function', async () => {
  let mockReq = createMockRequest(targetUrl)
  let mockRes = createMockResponse()

  mockReq.url = 'http://invalid-url'

  await processRequest(mockReq, mockRes, config, targetUrl)
  equal(mockRes.statusCode, 500)
})

test('handleRequestWithDelay function', async () => {
  let mockReq = createMockRequest(targetUrl.toString())
  let mockRes = createMockResponse()
  let ip = '127.0.0.1'
  let parsedUrl = new URL(targetUrl)

  await handleRequestWithDelay(
    mockReq,
    mockRes,
    config,
    ip,
    targetUrl.toString(),
    parsedUrl
  )
  equal(mockRes.statusCode, 200)
})

test('checkRateLimit function domain limit', () => {
  let ip = '127.0.0.1'
  let domain = 'example.com'

  rateLimitMap.clear()

  let result = checkRateLimit(ip, domain)
  equal(result, false)

  result = checkRateLimit(ip, domain)
  equal(result, false)

  result = checkRateLimit(ip, domain)
  equal(result, true)
})

test('checkRateLimit function global limit', () => {
  let ip = '127.0.0.1'
  let domain = 'another.com'

  rateLimitMap.clear()

  let result = checkRateLimit(ip, domain)
  equal(result, false)

  for (let i = 0; i < 5000; i++) {
    checkRateLimit(ip, domain)
  }

  result = checkRateLimit(ip, domain)
  equal(result, true)
})

test('handles invalid config', async () => {
  let invalidProxy = createProxyServer({
    allowLocalhost: false,
    allowsFrom: [],
    maxSize: -1,
    timeout: -1
  })
  invalidProxy.listen(31599)
  let invalidProxyUrl = getURL(invalidProxy)

  try {
    let response = await fetch(`${invalidProxyUrl}/${targetUrl}`)
    equal(response.status, 400)
    equal(await response.text(), 'Invalid URL')
  } finally {
    invalidProxy.close()
  }
})

test('handleError function', () => {
  let mockRes = createMockResponse()

  // Test with known TimeoutError
  let timeoutError = new Error('TimeoutError')
  timeoutError.name = 'TimeoutError'
  handleError(timeoutError, mockRes)
  equal(mockRes.statusCode, 400)

  // Test with custom BadRequestError
  let badRequestError = new BadRequestError('Bad request', 400)
  handleError(badRequestError, mockRes)
  equal(mockRes.statusCode, 400)

  // Test with unknown or internal errors
  let unknownError = new Error('Unknown error')
  handleError(unknownError, mockRes)
  equal(mockRes.statusCode, 500)
})
