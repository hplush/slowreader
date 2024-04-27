import isMartianIP from 'martian-cidr'
import type http from 'node:http'
import { createServer } from 'node:http'
import { isIP } from 'node:net'
import { styleText } from 'node:util'

class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BadRequestError'
  }
}

export function createProxyServer(config: {
  allowsFrom: string
  silent?: boolean
  timeout: number
}): http.Server {
  return createServer(async (req, res) => {
    let sent = false

    try {
      if (!req.url) {
        throw new BadRequestError('Bad URL')
      }
      let url = decodeURIComponent(req.url.slice(1))

      try {
        new URL(url)
      } catch {
        throw new BadRequestError('Invalid URL')
      }

      // Only HTTP or HTTPS protocols are allowed
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new BadRequestError('Only HTTP or HTTPS are supported')
      }

      // We do not typically need non-GET to load RSS
      if (req.method !== 'GET') {
        throw new BadRequestError('Only GET requests are allowed')
      }

      // We only allow request from production domain
      if (req.headers.origin) {
        if (
          !req.headers.origin.endsWith('/' + config.allowsFrom) &&
          !req.headers.origin.endsWith('.' + config.allowsFrom)
        ) {
          throw new BadRequestError('Unauthorized Origin')
        }
      }

      let requestUrl = new URL(url)
      if (
        (isIP(requestUrl.hostname) === 4 || isIP(requestUrl.hostname) === 6) &&
        isMartianIP(requestUrl.hostname)
      ) {
        throw new BadRequestError('Requests to internal IPs are not allowed')
      }

      // Remove all cookie headers so they will not be set on proxy domain
      delete req.headers.cookie
      delete req.headers['set-cookie']
      delete req.headers.host

      let targetResponse = await fetch(url, {
        headers: {
          ...(req.headers as HeadersInit),
          host: new URL(url).host
        },
        method: req.method,
        signal: AbortSignal.timeout(config.timeout)
      })

      res.writeHead(targetResponse.status, {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
        'Access-Control-Allow-Origin': req.headers.Origin || '*',
        'Content-Type':
          targetResponse.headers.get('content-type') ?? 'text/plain'
      })
      sent = true
      res.end(await targetResponse.text())
    } catch (e) {
      // Known errors
      if (e instanceof Error && e.name === 'TimeoutError') {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Bad Request: Request was aborted due to timeout')
        return
      } else if (e instanceof BadRequestError) {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end(`Bad Request: ${e.message}`)
        return
      }

      // Unknown or internal errors
      if (!config.silent) {
        if (e instanceof Error) {
          process.stderr.write(styleText('red', e.stack ?? e.message) + '\n')
        } else if (typeof e === 'string') {
          process.stderr.write(styleText('red', e) + '\n')
        }
      }
      if (!sent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal Server Error')
      }
    }
  })
}
