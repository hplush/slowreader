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
import { isIP } from 'node:net'
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
  maxSize: number
  requestTimeout: number
}

export const DEFAULT_PROXY_CONFIG: Omit<ProxyConfig, 'allowsFrom'> = {
  bodyTimeout: 10000,
  cacheSize: 32 * 1024 * 1024,
  dnsCacheTime: 60000,
  hostDelay: 500,
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

const PASSED_HEADERS = [
  'Content-Encoding',
  'ETag',
  'Last-Modified',
  'Retry-After',
  'RateLimit-Reset',
  'X-Rate-Limit-Reset'
]

function resolveLocation(location: string, from: string): string {
  let host = new URL(from).host
  return new URL(location.replace(/^(https?:)\/\/(?=\/)/i, `$1//${host}`), from)
    .href
}

function allowCors(req: IncomingMessage, res: ServerResponse): void {
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader(
      'Access-Control-Allow-Methods',
      'OPTIONS, POST, GET, PUT, DELETE'
    )
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
  if (!allowUnsafeDestinations) {
    if (
      !parsed.hostname.includes('.') ||
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
      if (options.all) {
        done(null, found)
        /* node:coverage disable */
      } else {
        done(null, found[0]!.address, found[0]!.family)
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
          headers,
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
      let url = decodeURIComponent(req.url!.slice(1).replace(/^proxy\//, ''))
      let parsedUrl = checkDestination(url, config.allowUnsafeDestinations)

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

      let debug = req.headers['x-slowreader-debug']
      let since = req.headers['if-modified-since']
      // Bodies are stored compressed, so the client must accept the same coding
      let key = `${url} ${req.headers['accept-encoding']}`
      delete req.headers.cookie
      delete req.headers['set-cookie']
      delete req.headers.host
      delete req.headers.origin
      delete req.headers.referer
      delete req.headers['x-real-ip']
      delete req.headers.te
      delete req.headers.dnt
      delete req.headers.pragma
      delete req.headers.priority
      delete req.headers['cache-control']
      delete req.headers.connection
      for (let header in req.headers) {
        if (
          header.startsWith('sec-') ||
          header.startsWith('x-slowreader-') ||
          header.startsWith('x-forwarded-')
        ) {
          delete req.headers[header]
        }
      }

      let requestHeaders = {
        ...req.headers,
        'host': parsedUrl.host,
        'user-agent': 'SlowReader/1.0 (+https://slowreader.app)'
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
        targetUrl = resolveLocation(targetResponse.headers.location, targetUrl)
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
        'Content-Type': targetResponse.headers['content-type'] ?? 'text/plain'
      }
      for (let header of PASSED_HEADERS) {
        let value = targetResponse.headers[header.toLowerCase()]
        if (typeof value === 'string') responseHeaders[header] = value
      }
      if (debug) {
        responseHeaders['x-slowreader-request'] =
          `${req.method} ${targetUrl}\\n` + formatHeaders(requestHeaders)
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
          transform(chunk: Buffer, _: BufferEncoding, next: TransformCallback) {
            if (cacheable) {
              size += chunk.length
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
