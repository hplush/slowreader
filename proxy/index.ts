import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { styleText } from 'node:util'

class BadRequestError extends Error {
  code: number

  constructor(message: string, code = 400, opts?: ErrorOptions) {
    super(message, opts)
    this.name = 'BadRequestError'
    this.code = code
  }
}

export interface ProxyConfig {
  allowLocalhost?: boolean
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

function allowCors(res: ServerResponse, origin: string): void {
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, POST, GET, PUT, DELETE'
  )
  res.setHeader('Access-Control-Allow-Origin', origin)
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
        res.end(message)
      } else {
        res.end()
      }
    }
    /* node:coverage enable */

    if (req.method === 'OPTIONS' && req.headers.origin) {
      allowCors(res, req.headers.origin)
      res.setHeader('Access-Control-Max-Age', '600')
      res.writeHead(204)
      return res.end()
    }

    try {
      if (req.headers.origin) {
        allowCors(res, req.headers.origin)
      }

      let url = decodeURIComponent(req.url!.slice(1).replace(/^proxy\//, ''))
      let parsedUrl = new URL(url)

      // Only HTTP or HTTPS protocols are allowed
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new BadRequestError('Only HTTP or HTTPS are supported')
      }

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

      if (
        (!config.allowLocalhost && parsedUrl.hostname === 'localhost') ||
        isIP(parsedUrl.hostname) !== 0
      ) {
        throw new BadRequestError('IP addresses are not allowed')
      }

      // Remove all cookie headers so they will not be set on proxy domain
      delete req.headers.cookie
      delete req.headers['set-cookie']
      delete req.headers.host

      let targetResponse: Response
      try {
        targetResponse = await fetch(url, {
          headers: {
            ...(req.headers as Record<string, string>),
            'host': parsedUrl.host,
            'X-Forwarded-For': req.socket.remoteAddress!
          },
          method: req.method,
          signal: AbortSignal.timeout(config.requestTimeout)
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

      let length: number | undefined
      if (targetResponse.headers.has('content-length')) {
        length = parseInt(targetResponse.headers.get('content-length')!)
      }
      if (length && length > config.maxSize) {
        throw new BadRequestError('Response too large', 413)
      }

      res.writeHead(targetResponse.status, {
        'Content-Type':
          targetResponse.headers.get('content-type') ?? 'text/plain'
      })
      sent = true

      if (targetResponse.body) {
        // @ts-expect-error Until Node.js types are broken
        let nodeStream = Readable.fromWeb(targetResponse.body)
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
