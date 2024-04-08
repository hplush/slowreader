// @ts-ignore
import isMartianIP from 'martian-cidr'
import type http from 'node:http'
import { createServer } from 'node:http'
import { styleText } from 'node:util'

/**
 * Creates proxy server
 *
 * isProduction - main toggle for production features:
 * - will allow only request that match productionDomainSuffix
 *
 * silentMode - will silent the output. Useful for testing
 *
 * hostnameWhitelist - Sometimes you need to allow request to certain ips like localhost for testing purposes.
 *
 * productionDomainSuffix - if isProduction, then only request from origins that match this param are allowed
 *
 * @example
 * const p = createProxyServer()
 * p.listen(5555).then(() => console.log('running on 5555'))
 *
 * @param { isProduction, silentMode, hostnameWhitelist, productionDomainSuffix } config
 */
const createProxyServer = (
  config: {
    hostnameWhitelist?: string[]
    isProduction?: boolean
    productionDomainSuffix?: string
    silentMode?: boolean
  } = {}
): http.Server => {
  let isProduction = config.isProduction || false
  let silentMode = config.silentMode || false
  let hostnameWhitelist = config.hostnameWhitelist || []
  let productionDomainSuffix = config.productionDomainSuffix || ''

  return createServer(async (req, res) => {
    let url = decodeURIComponent(req.url!.slice(1))
    let sent = false

    try {
      // Only http or https protocols are allowed
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Only http or https requests are allowed.')
      }

      // Other requests are typically used to modify the data, and we do not typically need them to load RSS
      if (req.method !== 'GET') {
        throw new Error('Only GET requests are allowed.')
      }

      // In production mode we only allow request from production domain
      if (isProduction) {
        let origin = req.headers.origin
        if (!origin?.endsWith(productionDomainSuffix)) {
          throw new Error('Unauthorized origin.')
        }
      }

      let requestUrl = new URL(url)
      if (!hostnameWhitelist.includes(requestUrl.hostname)) {
        // Do not allow requests to addresses that are reserved:
        // 127.*
        // 192.168.*,*
        // https://en.wikipedia.org/wiki/Reserved_IP_addresses
        if (isMartianIP(requestUrl.hostname)) {
          throw new Error(
            'Requests to IPs from local or reserved subnets are not allowed.'
          )
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
        'Access-Control-Allow-Origin': '*',
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
        if (!sent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Internal Server Error')
        }
      } else if (typeof e === 'string') {
        if (!silentMode) {
          process.stderr.write(styleText('red', e) + '\n')
        }
        if (!sent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Internal Server Error')
        }
      }
    }
  })
}

export default createProxyServer
