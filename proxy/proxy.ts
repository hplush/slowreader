// @ts-ignore
import isMartianIP from 'martian-cidr'
import type http from 'node:http'
import { createServer } from 'node:http'
import { styleText } from 'node:util'
import { isIP } from 'net'

export const createProxyServer = (
  config: {
    hostnameWhitelist?: string[]
    isProduction?: boolean
    productionDomainSuffix?: string
    silentMode?: boolean
  } = {}
): http.Server => {
  // Main toggle for production features
  let isProduction = config.isProduction || false
  // Silence the output. Used for testing
  let silentMode = config.silentMode || false
  // Allow request to certain ips like 'localhost'. Used for testing purposes
  let hostnameWhitelist = config.hostnameWhitelist || []
  // if isProduction, then only request from origins that match this param are allowed
  let productionDomainSuffix = config.productionDomainSuffix || ''

  return createServer(async (req, res) => {
    let url = decodeURIComponent(req.url!.slice(1))
    let sent = false

    try {
      // Only http or https protocols are allowed
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Bad Request: Only HTTP or HTTPS are supported')
        return
      }

      // Other requests are typically used to modify the data, and we do not typically need them to load RSS
      if (req.method !== 'GET') {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Bad Request: Only GET requests are allowed')
        return
      }

      // In production mode we only allow request from production domain
      if (isProduction) {
        let origin = req.headers.origin
        if (!origin?.endsWith(productionDomainSuffix)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Bad Request: Unauthorized origin')
          return
        }
      }

      let requestUrl = new URL(url)
      if (!hostnameWhitelist.includes(requestUrl.hostname)) {
        // Do not allow requests to addresses that are reserved:
        // 127.*
        // 192.168.*,*
        // https://en.wikipedia.org/wiki/Reserved_IP_addresses
        if (
          (isIP(requestUrl.hostname) === 4 ||
            isIP(requestUrl.hostname) === 6) &&
          isMartianIP(requestUrl.hostname)
        ) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Bad Request: Requests to reserved IPs are not allowed')
          return
        }
      }

      // Remove all cookie headers and host header from request
      delete req.headers.cookie
      delete req.headers['set-cookie']
      delete req.headers.host

      let targetResponse = await fetch(url, {
        headers: {
          ...(req.headers as HeadersInit),
          host: new URL(url).host
        },
        method: req.method
      })

      res.writeHead(targetResponse.status, {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
        'Access-Control-Allow-Origin': req.headers['Origin'] || '*',
        'Content-Type':
          targetResponse.headers.get('content-type') ?? 'text/plain'
      })
      sent = true
      res.write(await targetResponse.text())
      res.end()
    } catch (e) {
      if (e instanceof Error) {
        if (!silentMode) {
          process.stderr.write(styleText('red', e.stack ?? e.message) + '\n')
        }
      } else if (typeof e === 'string') {
        if (!silentMode) {
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
