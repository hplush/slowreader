import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createServer } from 'node:http'
import { isIP } from 'node:net'
import { styleText } from 'node:util'
import { setTimeout } from 'node:timers/promises'

class BadRequestError extends Error {
  code: number

  constructor(message: string, code = 400) {
    super(message)
    this.name = 'BadRequestError'
    this.code = code
  }
}

interface RateLimitInfo {
  count: number
  timestamp: number
}

interface ProxyConfig {
  allowLocalhost?: boolean
  allowsFrom: RegExp[]
  maxSize: number
  timeout: number
}

const RATE_LIMIT = {
  PER_DOMAIN: {
    LIMIT: 500,
    DURATION: 60 * 1000
  },
  GLOBAL: {
    LIMIT: 5000,
    DURATION: 60 * 1000
  }
}

let rateLimitMap: Map<string, RateLimitInfo> = new Map()
let requestQueue: Map<string, Promise<void>> = new Map()

function isRateLimited(ip: string, domain: string): boolean {
  let now = performance.now()

  let domainKey = `${ip}:${domain}`
  let domainRateLimit = rateLimitMap.get(domainKey) || {
    count: 0,
    timestamp: now
  }

  if (now - domainRateLimit.timestamp > RATE_LIMIT.PER_DOMAIN.DURATION) {
    domainRateLimit.count = 0
    domainRateLimit.timestamp = now
  }

  if (domainRateLimit.count >= RATE_LIMIT.PER_DOMAIN.LIMIT) {
    return true
  }

  let globalKey = ip
  let globalRateLimit = rateLimitMap.get(globalKey) || {
    count: 0,
    timestamp: now
  }

  if (now - globalRateLimit.timestamp > RATE_LIMIT.GLOBAL.DURATION) {
    globalRateLimit.count = 0
    globalRateLimit.timestamp = now
  }

  if (globalRateLimit.count >= RATE_LIMIT.GLOBAL.LIMIT) {
    return true
  }

  domainRateLimit.count += 1
  globalRateLimit.count += 1
  rateLimitMap.set(domainKey, domainRateLimit)
  rateLimitMap.set(globalKey, globalRateLimit)

  return false
}

function handleError(e: unknown, res: ServerResponse): void {
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

let processRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: ProxyConfig,
  url: string,
  parsedUrl: URL
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

let handleRequestWithDelay = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: ProxyConfig,
  ip: string,
  url: string,
  parsedUrl: URL
): Promise<void> => {
  let isRateLimitedFlag = isRateLimited(ip, parsedUrl.hostname)
  if (isRateLimitedFlag) {
    let existingQueue = requestQueue.get(ip) || Promise.resolve()
    let delayedRequest = existingQueue.then(() => setTimeout(1000))
    requestQueue.set(ip, delayedRequest)
    await delayedRequest
  }

  await processRequest(req, res, config, url, parsedUrl)
}

export function createProxyServer(config: ProxyConfig): Server {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    let sent = false

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
