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

export function createProxyServer(
  config: {
    fetchTimeout?: number
    hostnameWhitelist?: string[]
    isProduction?: boolean
    productionDomainSuffix?: string
    silentMode?: boolean
  } = {}
): http.Server {
  let isProduction = config.isProduction || false
  let silentMode = config.silentMode || false
  let hostnameWhitelist = config.hostnameWhitelist || []
  let productionDomainSuffix = config.productionDomainSuffix || ''
  let fetchTimeout = config.fetchTimeout || 2500

  return createServer(async (req, res) => {
    let url = decodeURIComponent(req.url!.slice(1))
    let sent = false

    try {
      // Only http or https protocols are allowed
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new BadRequestError('Only HTTP or HTTPS are supported')
      }

      // Other requests are typically used to modify the data, and we do not typically need them to load RSS
      if (req.method !== 'GET') {
        throw new BadRequestError('Only GET requests are allowed')
      }

      // In production mode we only allow request from production domain
      if (isProduction) {
        let origin = req.headers.origin
        if (!origin?.endsWith(productionDomainSuffix)) {
          throw new BadRequestError('Unauthorized Origin')
        }
      }

      let requestUrl = new URL(url)
      if (!hostnameWhitelist.includes(requestUrl.hostname)) {
        // Do not allow requests to addresses inside our cloud:
        // 127.*
        // 192.168.*,*
        // https://en.wikipedia.org/wiki/Reserved_IP_addresses
        if (
          (isIP(requestUrl.hostname) === 4 ||
            isIP(requestUrl.hostname) === 6) &&
          isMartianIP(requestUrl.hostname)
        ) {
          throw new BadRequestError('Requests to in-cloud ips are not allowed')
        }
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
        signal: AbortSignal.timeout(fetchTimeout)
      })

      res.writeHead(targetResponse.status, {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
        'Access-Control-Allow-Origin': req.headers.Origin || '*',
        'Content-Type':
          targetResponse.headers.get('content-type') ?? 'text/plain'
      })
      sent = true
      res.write(await targetResponse.text())
      res.end()
    } catch (e) {
      // Known errors:
      if (e instanceof Error && e.name === 'TimeoutError') {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Bad Request: Request was aborted due to timeout')
        return
      }

      if (e instanceof BadRequestError) {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end(`Bad Request: ${e.message}`)
        return
      }

      // Unknown or internal errors:

      if (!silentMode) {
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
