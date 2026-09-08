import {
  lookup as resolve,
  type LookupAddress,
  type LookupOptions
} from 'node:dns'
import {
  Agent as HttpAgent,
  type IncomingHttpHeaders,
  type IncomingMessage,
  request as httpRequest,
  type ServerResponse
} from 'node:http'
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https'
import { BlockList, isIP } from 'node:net'
import { Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { setTimeout } from 'node:timers/promises'
import { styleText } from 'node:util'

function formatHeaders(headers: IncomingHttpHeaders): string {
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${String(value)}`)
    .join('\\n')
}

class BadRequestError extends Error {
  code: number

  constructor(message: string, code = 400, opts?: ErrorOptions) {
    super(message, opts)
    this.name = 'BadRequestError'
    this.code = code
  }
}

export interface ProxyConfig {
  allowUnsafeDestinations?: boolean
  allowsFrom: string
  bodyTimeout: number
  cacheSize: number
  dnsCacheTime: number
  hostDelay: number
  ipLimit: number
  ipWindow: number
  maxRequests: number
  maxSize: number
  requestTimeout: number
}

export const DEFAULT_PROXY_CONFIG: Omit<ProxyConfig, 'allowsFrom'> = {
  bodyTimeout: 10000,
  cacheSize: 32 * 1024 * 1024,
  dnsCacheTime: 60000,
  hostDelay: 500,
  ipLimit: 600,
  ipWindow: 60000,
  maxRequests: 100,
  maxSize: 10 * 1024 * 1024,
  requestTimeout: 10000
}

interface CachedResponse {
  body: Buffer
  expires: number
  headers: Record<string, string>
  status: number
}

const REDIRECTS = new Set([301, 302, 303, 307, 308])

const MAX_REDIRECTS = 10

const SENT_HEADERS = [
  'accept',
  'accept-encoding',
  'if-modified-since',
  'if-none-match',
  'range'
]

const PASSED_HEADERS = [
  'Content-Encoding',
  'ETag',
  'Last-Modified',
  'Retry-After',
  'RateLimit-Reset',
  'X-Rate-Limit-Reset'
]

const PRIVATE = new BlockList()
PRIVATE.addSubnet('0.0.0.0', 8, 'ipv4')
PRIVATE.addSubnet('10.0.0.0', 8, 'ipv4')
PRIVATE.addSubnet('100.64.0.0', 10, 'ipv4')
PRIVATE.addSubnet('127.0.0.0', 8, 'ipv4')
PRIVATE.addSubnet('169.254.0.0', 16, 'ipv4')
PRIVATE.addSubnet('172.16.0.0', 12, 'ipv4')
PRIVATE.addSubnet('192.0.0.0', 24, 'ipv4')
PRIVATE.addSubnet('192.168.0.0', 16, 'ipv4')
PRIVATE.addSubnet('198.18.0.0', 15, 'ipv4')
PRIVATE.addSubnet('224.0.0.0', 4, 'ipv4')
PRIVATE.addSubnet('240.0.0.0', 4, 'ipv4')
PRIVATE.addAddress('::', 'ipv6')
PRIVATE.addAddress('::1', 'ipv6')
PRIVATE.addSubnet('fc00::', 7, 'ipv6')
PRIVATE.addSubnet('fe80::', 10, 'ipv6')
PRIVATE.addSubnet('ff00::', 8, 'ipv6')

function isPublic(found: LookupAddress): boolean {
  let address = found.address.replace(/^::ffff:/i, '')
  return !PRIVATE.check(address, isIP(address) === 4 ? 'ipv4' : 'ipv6')
}

function resolveLocation(location: string, from: string): string {
  let host = new URL(from).host
  return new URL(location.replace(/^(https?:)\/\/(?=\/)/i, `$1//${host}`), from)
    .href
}

function allowCors(req: IncomingMessage, res: ServerResponse): void {
  if (req.headers.origin) {
    res.setHeader(
      'Access-Control-Allow-Headers',
      'If-Modified-Since, If-None-Match, Range, X-Slowreader-Debug'
    )
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET')
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    let exposed = 'Retry-After, RateLimit-Reset, X-Rate-Limit-Reset'
    if (req.headers['x-slowreader-debug']) {
      exposed += ', x-slowreader-request, x-slowreader-response'
    }
    res.setHeader('Access-Control-Expose-Headers', exposed)
  }
}

function checkDestination(
  target: string,
  allowUnsafeDestinations?: boolean
): URL {
  let parsed = new URL(target)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('Only HTTP or HTTPS are supported')
  }
  // Names without a known local suffix are checked again after DNS,
  // where rebinding can not hide the real address
  if (!allowUnsafeDestinations) {
    if (
      parsed.hostname.includes('.localhost') ||
      /\.(local|internal)$/.test(parsed.hostname) ||
      parsed.hostname === 'localhost.' ||
      isIP(parsed.hostname.replace(/^\[|\]$/g, '')) !== 0
    ) {
      throw new BadRequestError('IP addresses or local domains are not allowed')
    }
  }
  return parsed
}

function getMaxAge(control: string | string[] | undefined): number {
  if (typeof control !== 'string') return 0
  if (/no-store|no-cache|private/.test(control)) return 0
  let maxAge = /max-age=(\d+)/.exec(control)
  return maxAge ? parseInt(maxAge[1]!) : 0
}

export function createProxy(
  config: ProxyConfig
): (req: IncomingMessage, res: ServerResponse) => void {
  let allowsFrom = new RegExp(config.allowsFrom)

  let httpAgent = new HttpAgent({ keepAlive: true })
  let httpsAgent = new HttpsAgent({ keepAlive: true })

  // Node resolves every request from scratch, while feed hosts repeat a lot
  let addresses = new Map<string, { expires: number; found: LookupAddress[] }>()

  function lookup(
    hostname: string,
    options: LookupOptions,
    done: (
      error: NodeJS.ErrnoException | null,
      address: LookupAddress[] | string,
      family?: number
    ) => void
  ): void {
    function answer(found: LookupAddress[]): void {
      let allowed = config.allowUnsafeDestinations
        ? found
        : found.filter(isPublic)
      if (allowed.length === 0) {
        done(new Error('IP addresses or local domains are not allowed'), [])
      } else if (options.all) {
        done(null, allowed)
        /* node:coverage disable */
      } else {
        done(null, allowed[0]!.address, allowed[0]!.family)
      }
      /* node:coverage enable */
    }

    let key = `${hostname} ${options.family ?? 0}`
    let cached = addresses.get(key)
    if (cached && cached.expires > Date.now()) {
      answer(cached.found)
    } else {
      resolve(hostname, { ...options, all: true }, (error, found) => {
        if (error) {
          done(error, [])
        } else {
          addresses.set(key, {
            expires: Date.now() + config.dnsCacheTime,
            found
          })
          answer(found)
        }
      })
    }
  }

  function loadTarget(
    url: string,
    headers: IncomingHttpHeaders
  ): Promise<IncomingMessage> {
    return new Promise((done, fail) => {
      let secure = new URL(url).protocol === 'https:'
      let target = (secure ? httpsRequest : httpRequest)(
        url,
        {
          agent: secure ? httpsAgent : httpAgent,
          // Redirects can move us to another host, so it can not be set once
          headers: { ...headers, host: new URL(url).host },
          lookup,
          timeout: config.requestTimeout
        },
        done
      )
      target.on('timeout', () => {
        target.destroy(new BadRequestError('Timeout'))
      })
      target.on('error', error => {
        if (error instanceof BadRequestError) {
          fail(error)
        } else {
          fail(new BadRequestError(error.message, 400, { cause: error }))
        }
      })
      target.end()
    })
  }

  let queuesByHost = new Map<string, Promise<unknown>>()

  function queueByHost<Result>(
    host: string,
    load: () => Promise<Result>
  ): Promise<Result> {
    let result = (queuesByHost.get(host) ?? Promise.resolve()).then(load, load)
    let next = result.then(
      () => setTimeout(config.hostDelay),
      () => setTimeout(config.hostDelay)
    )
    queuesByHost.set(host, next)
    void next.then(() => {
      if (queuesByHost.get(host) === next) queuesByHost.delete(host)
    })
    return result
  }

  let requestsByIp = new Map<string, number>()
  let windowStarted = Date.now()
  let inFlight = 0

  function countRequest(req: IncomingMessage): number {
    let now = Date.now()
    if (now - windowStarted > config.ipWindow) {
      requestsByIp.clear()
      windowStarted = now
    }
    // Our own load balancer sets the header, clients can not be trusted here
    let from =
      req.headers['x-real-ip'] ??
      req.headers['x-forwarded-for'] ??
      req.socket.remoteAddress!
    let ip = (Array.isArray(from) ? from[0]! : from).split(',')[0]!.trim()
    let count = (requestsByIp.get(ip) ?? 0) + 1
    requestsByIp.set(ip, count)
    return count
  }

  let cache = new Map<string, CachedResponse>()
  let cachedSize = 0

  function dropCached(key: string): void {
    let entry = cache.get(key)
    if (entry) {
      cachedSize -= entry.body.length
      cache.delete(key)
    }
  }

  return async (req, res) => {
    let sent = false

    /* node:coverage disable */
    function sendError(statusCode: number, message: string): void {
      if (!sent) {
        res.writeHead(statusCode, { 'Content-Type': 'text/plain' })
        res.end(message + '\n')
      } else {
        res.end()
      }
    }
    /* node:coverage enable */

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      return res.end('OK\n')
    }

    allowCors(req, res)

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '600')
      res.writeHead(204)
      return res.end()
    }

    try {
      // We do not typically need non-GET to load RSS
      if (req.method !== 'GET') {
        throw new BadRequestError('Only GET is allowed', 405)
      }

      // We only allow request from our app
      let origin = req.headers.origin
      if (!origin && req.headers.referer) {
        origin = new URL(req.headers.referer).origin
      }
      if (!origin || !allowsFrom.test(origin)) {
        throw new BadRequestError(
          `Unauthorized Origin. Only ${allowsFrom} is allowed.`
        )
      }

      // Origin is set by browsers only, so bots still can use us as a relay
      if (countRequest(req) > config.ipLimit) {
        throw new BadRequestError('Too many requests', 429)
      }

      let url = decodeURIComponent(req.url!.slice(1).replace(/^proxy\//, ''))
      let parsedUrl = checkDestination(url, config.allowUnsafeDestinations)

      let debug = req.headers['x-slowreader-debug']
      let since = req.headers['if-modified-since']
      // Bodies are stored compressed, so the client must accept the same coding
      let key = `${url} ${req.headers['accept-encoding']}`
      // Anything we do not list here is the user’s data and stays with us
      let requestHeaders: IncomingHttpHeaders = {
        'user-agent': 'SlowReader/1.0 (+https://slowreader.app)'
      }
      for (let header of SENT_HEADERS) {
        let value = req.headers[header]
        if (value) requestHeaders[header] = value
      }

      let hit = debug ? undefined : cache.get(key)
      if (hit && hit.expires <= Date.now()) {
        dropCached(key)
        hit = undefined
      }
      if (hit) {
        let modified = hit.headers['Last-Modified']
        if (since && modified && new Date(since) >= new Date(modified)) {
          res.writeHead(304, hit.headers)
        } else {
          res.writeHead(hit.status, hit.headers)
          res.write(hit.body)
        }
        return res.end()
      }

      if (inFlight >= config.maxRequests) {
        throw new BadRequestError('Too many requests', 503)
      }
      inFlight += 1
      try {
        let targetUrl = url
        let targetResponse = await queueByHost(parsedUrl.hostname, () => {
          return loadTarget(targetUrl, requestHeaders)
        })
        let redirects = 0
        while (
          REDIRECTS.has(targetResponse.statusCode!) &&
          targetResponse.headers.location
        ) {
          if (redirects === MAX_REDIRECTS) {
            throw new BadRequestError('Too many redirects')
          }
          redirects += 1
          // Draining lets the agent keep the connection for the next request
          targetResponse.resume()
          targetUrl = resolveLocation(
            targetResponse.headers.location,
            targetUrl
          )
          let redirected = checkDestination(
            targetUrl,
            config.allowUnsafeDestinations
          )
          targetResponse = await queueByHost(redirected.hostname, () => {
            return loadTarget(targetUrl, requestHeaders)
          })
        }

        let length = parseInt(targetResponse.headers['content-length'] ?? '')
        if (length > config.maxSize) {
          throw new BadRequestError('Response too large', 413)
        }

        let responseHeaders: Record<string, string> = {
          // Proxied HTML must not run as our own page on preview deploys
          'Content-Security-Policy': 'sandbox',
          'Content-Type':
            targetResponse.headers['content-type'] ?? 'text/plain',
          'X-Content-Type-Options': 'nosniff'
        }
        for (let header of PASSED_HEADERS) {
          let value = targetResponse.headers[header.toLowerCase()]
          if (typeof value === 'string') responseHeaders[header] = value
        }
        if (debug) {
          responseHeaders['x-slowreader-request'] =
            `${req.method} ${targetUrl}\\n` +
            formatHeaders({ ...requestHeaders, host: new URL(targetUrl).host })
          responseHeaders['x-slowreader-response'] =
            `${targetResponse.statusCode}\\n` +
            formatHeaders(targetResponse.headers)
        }
        res.writeHead(targetResponse.statusCode!, responseHeaders)
        sent = true

        let maxAge = debug
          ? 0
          : getMaxAge(targetResponse.headers['cache-control'])
        let cacheable = maxAge > 0 && targetResponse.statusCode === 200
        let chunks: Buffer[] = []
        let size = 0
        await pipeline(
          targetResponse,
          new Transform({
            transform(
              chunk: Buffer,
              _: BufferEncoding,
              next: TransformCallback
            ) {
              size += chunk.length
              // Most feeds answer without Content-Length, so we count it here
              if (size > config.maxSize) {
                next(new BadRequestError('Response too large', 413))
                return
              }
              if (cacheable) {
                if (size > config.cacheSize) {
                  cacheable = false
                  chunks = []
                } else {
                  chunks.push(chunk)
                }
              }
              next(null, chunk)
            }
          }),
          res,
          { signal: AbortSignal.timeout(config.bodyTimeout) }
        )
        res.end()

        if (cacheable) {
          dropCached(key)
          cache.set(key, {
            body: Buffer.concat(chunks),
            expires: Date.now() + maxAge * 1000,
            headers: responseHeaders,
            status: targetResponse.statusCode!
          })
          cachedSize += size
          for (let old of cache.keys()) {
            if (cachedSize <= config.cacheSize) break
            dropCached(old)
          }
        }
      } finally {
        inFlight -= 1
      }
    } catch (e) {
      /* node:coverage disable */
      // Known errors
      if (e instanceof Error && e.message === 'Invalid URL') {
        sendError(400, 'Invalid URL')
        return
      } else if (e instanceof BadRequestError) {
        sendError(e.code, e.message)
        return
      }

      // Unknown or Internal errors
      if (e instanceof Error) {
        process.stderr.write(styleText('red', e.stack ?? e.message) + '\n')
      } else if (typeof e === 'string') {
        process.stderr.write(styleText('red', e) + '\n')
      }
      sendError(500, 'Internal Server Error')
    }
    /* node:coverage enable */
  }
}
