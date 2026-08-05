import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { styleText } from 'node:util'

function firstValue(header: string | string[] | undefined): string | undefined {
  let value = Array.isArray(header) ? header[0] : header
  return value?.split(',')[0]?.trim()
}

function formatHeaders(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([name, value]) => `${name}: ${value}`)
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
  maxSize: number
  requestTimeout: number
}

export const DEFAULT_PROXY_CONFIG: Omit<ProxyConfig, 'allowsFrom'> = {
  bodyTimeout: 10000,
  maxSize: 10 * 1024 * 1024,
  requestTimeout: 10000
}

const REDIRECTS = new Set([301, 302, 303, 307, 308])

const MAX_REDIRECTS = 10

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
    if (req.headers['x-slowreader-debug']) {
      res.setHeader(
        'Access-Control-Expose-Headers',
        'x-slowreader-request, x-slowreader-response'
      )
    }
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

async function loadTarget(
  method: string,
  url: string,
  headers: Record<string, string>,
  requestTimeout: number
): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { ...headers, host: new URL(url).host },
      method: method,
      redirect: 'manual',
      signal: AbortSignal.timeout(requestTimeout)
    })
  } catch (e) {
    /* node:coverage disable */
    if (e instanceof TypeError) {
      throw new BadRequestError(e.message, 400, { cause: e })
    } else if (e instanceof Error && e.name === 'TimeoutError') {
      throw new BadRequestError('Timeout', 400, { cause: e })
    } else {
      throw e
    }
    /* node:coverage enable */
  }
}

export function createProxy(
  config: ProxyConfig
): (req: IncomingMessage, res: ServerResponse) => void {
  let allowsFrom = new RegExp(config.allowsFrom)

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
      let clientIp =
        firstValue(req.headers['x-real-ip']) ??
        firstValue(req.headers['x-forwarded-for']) ??
        req.socket.remoteAddress!
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
        ...(req.headers as Record<string, string>),
        'host': parsedUrl.host,
        'X-Forwarded-For': clientIp
      }

      let targetUrl = url
      let targetResponse = await loadTarget(
        req.method,
        targetUrl,
        requestHeaders,
        config.requestTimeout
      )
      let redirects = 0
      while (
        REDIRECTS.has(targetResponse.status) &&
        targetResponse.headers.has('location')
      ) {
        if (redirects === MAX_REDIRECTS) {
          throw new BadRequestError('Too many redirects')
        }
        redirects += 1
        void targetResponse.body?.cancel()
        targetUrl = resolveLocation(
          targetResponse.headers.get('location')!,
          targetUrl
        )
        checkDestination(targetUrl)
        targetResponse = await loadTarget(
          req.method,
          targetUrl,
          requestHeaders,
          config.requestTimeout
        )
      }

      if (
        req.headers['if-modified-since'] &&
        targetResponse.headers.has('last-modified')
      ) {
        try {
          let cachedAt = new Date(req.headers['if-modified-since'])
          let updatedAt = new Date(targetResponse.headers.get('last-modified')!)

          if (cachedAt.getTime() >= updatedAt.getTime()) {
            res.setHeader('Last-Modified', updatedAt.toUTCString())
            res.writeHead(304)
            return res.end()
          }
          /* node:coverage disable */
        } catch (e) {
          let message = 'Skipping cache check due to malformed date headers'
          if (e instanceof Error) {
            message += `: ${e.stack ?? e.message}`
          } else if (typeof e === 'string') {
            message += `: ${e}`
          }
          process.stderr.write(styleText('yellow', message) + '\n')
        }
        /* node:coverage enable */
      }

      let length: number | undefined
      if (targetResponse.headers.has('content-length')) {
        length = parseInt(targetResponse.headers.get('content-length')!)
      }
      if (length && length > config.maxSize) {
        throw new BadRequestError('Response too large', 413)
      }

      let responseHeaders: Record<string, string> = {
        'Content-Type':
          targetResponse.headers.get('content-type') ?? 'text/plain'
      }
      if (debug) {
        responseHeaders['x-slowreader-request'] =
          `${req.method} ${targetUrl}\\n` + formatHeaders(requestHeaders)
        responseHeaders['x-slowreader-response'] =
          `${targetResponse.status}\\n` +
          formatHeaders(Object.fromEntries(targetResponse.headers.entries()))
      }
      res.writeHead(targetResponse.status, responseHeaders)
      sent = true

      if (targetResponse.body) {
        let nodeStream = Readable.fromWeb(
          // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
          targetResponse.body as WebReadableStream
        )
        await pipeline(nodeStream, res, {
          signal: AbortSignal.timeout(config.bodyTimeout)
        })
      }
      res.end()
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
