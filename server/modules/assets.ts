import type { BaseServer } from '@logux/server'
import { createHash } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { extname, join, normalize } from 'node:path'

import { config } from '../config.ts'

interface Asset {
  contentType: string
  data: Buffer
  headers: Record<string, string>
}

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2'
}

const CONTENT_SECURITY_POLICIES: Record<string, string> = {
  'base-uri': "'none'",
  'form-action': "'none'",
  'frame-ancestors': "'none'",
  'object-src': "'none'",
  'script-src': "'self'",
  'style-src': "'self'"
}

const HASHED = /-[\w]{8}\.\w+$/

function sha512(content: string): string {
  return createHash('sha512').update(content, 'utf8').digest('base64')
}

function getPageHeaders(data: Buffer): Asset['headers'] {
  let headers: Asset['headers'] = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff'
  }
  let html = data.toString()

  let csp = { ...CONTENT_SECURITY_POLICIES }
  let css = html.match(/<style>([\s\S]*?)<\/style>/)
  if (css) csp['style-src'] += ' ' + sha512(css[1]!)
  let js = html.match(/<script>([\s\S]*?)<\/script>/)
  if (js) csp['script-src'] += ' ' + sha512(js[1]!)

  headers['Content-Security-Policy'] = Object.entries(csp)
    .map(([k, v]) => `${k} ${v}`)
    .join('; ')
  return headers
}

function send(res: ServerResponse, asset: Asset): void {
  for (let [header, value] of Object.entries(asset.headers)) {
    res.setHeader(header, value)
  }
  res.writeHead(200, { 'Content-Type': asset.contentType })
  res.end(asset.data)
}

export default async (
  server: BaseServer,
  { assets, routes } = config
): Promise<void> => {
  if (!assets) return
  server.logger.info('Assets serving is enabled')

  // Headers/redirect logics is duplicated between this file and web/nginx.conf.
  // If you change anything here, change the second place too.

  let CACHE: Record<string, Asset> = {}

  let html = await readFile(join(assets, 'index.html'))
  let appHtml: Asset = {
    contentType: 'text/html',
    data: html,
    headers: getPageHeaders(html)
  }

  let routesData = await readFile(routes)
  let routesRegexp = new RegExp(routesData.toString())

  server.http(async (req, res) => {
    if (req.method !== 'GET') return false

    let url = new URL(req.url!, `https://${req.headers.host}`)
    let pathname = url.pathname.replace(/\/$/, '')
    let safe = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
    let cacheKey = safe
    let path = join(assets, safe)

    if (routesRegexp.test(pathname)) {
      send(res, appHtml)
      return true
    }

    if (!CACHE[cacheKey]) {
      if (!existsSync(path)) return false
      if (statSync(path).isDirectory()) {
        path = join(path, 'index.html')
      }
      let contentType = MIME_TYPES[extname(path)] || 'application/octet-stream'
      let data = await readFile(path)
      let headers: Asset['headers'] = {}
      if (pathname.includes('/assets/') && HASHED.test(path)) {
        headers['Cache-Control'] = 'public, immutable'
      }
      CACHE[cacheKey] = { contentType, data, headers }
    }

    send(res, CACHE[cacheKey])
    return true
  })
  server.http('GET', '/', (req, res) => {
    send(res, appHtml)
  })
}
