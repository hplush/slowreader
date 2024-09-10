import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import { styleText } from 'node:util'

class BadRequestError extends Error {
  code: number

  constructor(message: string, code = 400) {
    super(message)
    this.name = 'BadRequestError'
    this.code = code
  }
}

export interface ProxyConfig {
  allowLocalhost?: boolean
  allowsFrom: string
  maxSize: number
  timeout: number
}

export const DEFAULT_PROXY_CONFIG: Omit<ProxyConfig, 'allowsFrom'> = {
  maxSize: 10 * 1024 * 1024,
  timeout: 2500
}

export function createProxy(
  config: ProxyConfig
): (req: IncomingMessage, res: ServerResponse) => void {
  let allowsFrom = new RegExp(config.allowsFrom)
  return async (req, res) => {
    let sent = false

    try {
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

      let targetResponse = await fetch(url, {
        headers: {
          ...(req.headers as HeadersInit),
          'host': parsedUrl.host,
          'X-Forwarded-For': req.socket.remoteAddress!
        },
        method: req.method,
        signal: AbortSignal.timeout(config.timeout)
      })

      let length: number | undefined
      if (targetResponse.headers.has('content-length')) {
        length = parseInt(targetResponse.headers.get('content-length')!)
      }
      if (length && length > config.maxSize) {
        throw new BadRequestError('Response too large', 413)
      }

      res.writeHead(targetResponse.status, {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
        'Access-Control-Allow-Origin': req.headers.origin,
        'Content-Type':
          targetResponse.headers.get('content-type') ?? 'text/plain'
      })
      sent = true

      let size = 0
      if (targetResponse.body) {
        let reader = targetResponse.body.getReader()
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
      // Known errors
      if (e instanceof Error && e.name === 'TimeoutError') {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Timeout')
        return
      } else if (e instanceof Error && e.message === 'Invalid URL') {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Invalid URL')
        return
      } else if (e instanceof BadRequestError) {
        res.writeHead(e.code, { 'Content-Type': 'text/plain' })
        res.end(e.message)
        return
      }
      /* c8 ignore next 11 */

      // Unknown or Internal errors
      if (e instanceof Error) {
        process.stderr.write(styleText('red', e.stack ?? e.message) + '\n')
      } else if (typeof e === 'string') {
        process.stderr.write(styleText('red', e) + '\n')
      }
      if (!sent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal Server Error')
      }
    }
  }
}
