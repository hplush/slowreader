import type { Server } from 'node:http'
import { createServer } from 'node:http'
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

export function createProxyServer(config: {
  allowLocalhost?: boolean
  allowsFrom: RegExp[]
  maxSize: number
  timeout: number
}): Server {
  return createServer(async (req, res) => {
    let sent = false

    try {
      let url = decodeURIComponent((req.url ?? '').slice(1))

      let parsedUrl: URL
      try {
        parsedUrl = new URL(url)
      } catch {
        throw new BadRequestError('Invalid URL')
      }

      // Only HTTP or HTTPS protocols are allowed
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new BadRequestError('Only HTTP or HTTPS are supported')
      }

      // We do not typically need non-GET to load RSS
      if (req.method !== 'GET') {
        throw new BadRequestError('Only GET is allowed', 405)
      }

      // We only allow request from our app
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
      } else if (e instanceof BadRequestError) {
        res.writeHead(e.code, { 'Content-Type': 'text/plain' })
        res.end(e.message)
        return
      }

      // Unknown or Internal errors
      /* c8 ignore next 9 */
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
  })
}
