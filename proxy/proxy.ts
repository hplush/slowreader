// noinspection ExceptionCaughtLocallyJS

import { createServer } from 'node:http'
import { styleText } from 'node:util'

const PORT = 5284
const IS_PRODUCTION = process.env.mode === 'production'
const PRODUCTION_DOMAIN_SUFFIX = '.slowreader.app'

const server = createServer(async (req, res) => {
  // Todo (@toplenboren) what about other protocols? We do not want ssh for example
  // Todo (@toplenboren) what about adding a rate limiter?
  let url = decodeURIComponent(req.url!.slice(1))
  let sent = false

  try {
    // Other requests are used to modify the data, and we do not need them to load RSS
    if (req.method !== 'GET') {
      throw new Error('Only GET requests are allowed.')
    }

    // In production mode we only allow request from production domain
    if (IS_PRODUCTION) {
      const origin = req.headers.origin
      if (!origin || !origin.endsWith(PRODUCTION_DOMAIN_SUFFIX)) {
        throw new Error('Unauthorized origin.')
      }
    }

    // Todo (@toplenboren) what to do with ipv6?
    // Todo (@toplenboren) what about those: https://en.wikipedia.org/wiki/Reserved_IP_addresses
    // Do not allow requests to addresses that are reserved:
    // 127.*
    // 192.168.*,*
    const localhostRegex =
      /^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$/
    const requestUrl = new URL(url)
    if (localhostRegex.test(requestUrl.hostname)) {
      throw new Error('Requests to localhost IP addresses are not allowed.')
    }

    // Remove all cookie headers and host header from request
    delete req.headers.cookie
    delete req.headers['set-cookie']
    delete req.headers.host

    let proxy = await fetch(url, {
      headers: {
        ...(req.headers as HeadersInit),
        host: new URL(url).host
      },
      method: req.method
    })

    res.writeHead(proxy.status, {
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': proxy.headers.get('content-type') ?? 'text/plain'
    })
    sent = true
    res.write(await proxy.text())
    res.end()
  } catch (e) {
    if (e instanceof Error) {
      process.stderr.write(styleText('red', e.stack ?? e.message) + '\n')
      if (!sent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal Server Error')
      }
    } else if (typeof e === 'string') {
      process.stderr.write(styleText('red', e) + '\n')
    }
  }
})

server.listen(PORT, () => {
  process.stderr.write(
    styleText('green', `Proxy server running on port ${PORT}`)
  )
})
