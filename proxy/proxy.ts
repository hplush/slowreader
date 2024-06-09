import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { isIP } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import { styleText } from 'node:util'

export class BadRequestError extends Error {
  code: number

  constructor(message: string, code = 400) {
    super(message)
    this.name = 'BadRequestError'
    this.code = code
  }
}

export interface RateLimitInfo {
  count: number
  timestamp: number
}

export interface ProxyConfig {
  allowLocalhost?: boolean
  allowsFrom: RegExp[]
  maxSize: number
  timeout: number
}

const RATE_LIMIT = {
  GLOBAL: {
    DURATION: 60 * 1000,
    LIMIT: 5000
  },
  PER_DOMAIN: {
    DURATION: 60 * 1000,
    LIMIT: 500
  }
}

export let rateLimitMap: Map<string, RateLimitInfo> = new Map()
let requestQueue: Map<string, Promise<void>> = new Map()

export function isRateLimited(
  key: string,
  store: Map<string, RateLimitInfo>,
  limit: { DURATION: number; LIMIT: number }
): boolean {
  let now = performance.now()
  let rateLimitInfo = store.get(key) || { count: 0, timestamp: now }

  if (now - rateLimitInfo.timestamp > limit.DURATION) {
    rateLimitInfo.count = 0
    rateLimitInfo.timestamp = now
  }

  if (rateLimitInfo.count >= limit.LIMIT) {
    return true
  }

  rateLimitInfo.count += 1
  store.set(key, rateLimitInfo)

  return false
}

export function checkRateLimit(ip: string, domain: string): boolean {
  return ['domain', 'global'].some(type => {
    let key = type === 'domain' ? `${ip}:${domain}` : ip
    let limit = type === 'domain' ? RATE_LIMIT.PER_DOMAIN : RATE_LIMIT.GLOBAL
    return isRateLimited(key, rateLimitMap, limit)
  })
}

export function handleError(e: unknown, res: ServerResponse): void {
  // Known errors
  if (e instanceof Error && e.name === 'TimeoutError') {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('Timeout')
  } else if (e instanceof BadRequestError) {
    res.writeHead(e.code, { 'Content-Type': 'text/plain' })
    res.end(e.message)
  } else {
    // Unknown or Internal errors
    /* c8 ignore next 9 */
    if (e instanceof Error) {
      process.stderr.write(styleText('red', e.stack ?? e.message) + '\n')
    } else if (typeof e === 'string') {
      process.stderr.write(styleText('red', e) + '\n')
    }
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
}

export let processRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: ProxyConfig,
  url: string
): Promise<void> => {
  try {
    // Remove all cookie headers so they will not be set on proxy domain
    delete req.headers.cookie
    delete req.headers['set-cookie']
    delete req.headers.host

    let targetResponse = await fetch(url, {
      headers: {
        ...(req.headers as HeadersInit),
        'host': new URL(url).host,
        'X-Forwarded-For': req.socket.remoteAddress!
      },
      method: req.method,
      signal: AbortSignal.timeout(config.timeout)
    })

    let length = targetResponse.headers.has('content-length')
      ? parseInt(targetResponse.headers.get('content-length')!)
      : undefined

    if (length && length > config.maxSize) {
      throw new BadRequestError('Response too large', 413)
    }

    res.writeHead(targetResponse.status, {
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
      'Access-Control-Allow-Origin': req.headers.origin,
      'Content-Type': targetResponse.headers.get('content-type') ?? 'text/plain'
    })

    if (targetResponse.body) {
      let reader = targetResponse.body.getReader()
      let size = 0
      let chunk: ReadableStreamReadResult<Uint8Array>
      do {
        chunk = await reader.read()
        if (chunk.value) {
          res.write(chunk.value)
          size += chunk.value.length
          if (size > config.maxSize) {
            break
          }
        }
      } while (!chunk.done)
    }
    res.end()
  } catch (e) {
    handleError(e, res)
  }
}

export let handleRequestWithDelay = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: ProxyConfig,
  ip: string,
  url: string,
  parsedUrl: URL
): Promise<void> => {
  if (checkRateLimit(ip, parsedUrl.hostname)) {
    let existingQueue = requestQueue.get(ip) || Promise.resolve()
    let delayedRequest = existingQueue.then(() => setTimeout(1000))
    requestQueue.set(ip, delayedRequest)
    await delayedRequest
  }

  await processRequest(req, res, config, url)
}

export function createProxyServer(config: ProxyConfig): Server {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      let ip = req.socket.remoteAddress!
      let url = decodeURIComponent((req.url ?? '').slice(1))

      let parsedUrl: URL
      try {
        parsedUrl = new URL(url)
      } catch {
        throw new BadRequestError('Invalid URL')
      }

      req.headers.origin = 'http://localhost:5284/' // debug

      // Only HTTP or HTTPS protocols are allowed
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new BadRequestError('Only HTTP or HTTPS are supported')
      }

      // We do not typically need non-GET to load RSS
      if (req.method !== 'GET') {
        throw new BadRequestError('Only GET is allowed', 405)
      }

      // We only allow requests from our app
      if (
        !req.headers.origin ||
        !config.allowsFrom.some(allowed => allowed.test(req.headers.origin!))
      ) {
        throw new BadRequestError('Unauthorized Origin')
      }

      if (
        (!config.allowLocalhost && parsedUrl.hostname === 'localhost') ||
        isIP(parsedUrl.hostname) !== 0
      ) {
        throw new BadRequestError('IP addresses are not allowed')
      }

      await handleRequestWithDelay(req, res, config, ip, url, parsedUrl)
    } catch (e) {
      handleError(e, res)
    }
  })
}
