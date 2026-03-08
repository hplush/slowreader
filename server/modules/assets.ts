import type { BaseServer } from '@logux/server'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { extname, join, normalize } from 'node:path'

import { config } from '../lib/config.ts'

interface Asset {
  contentType: string
  data: Buffer
  headers: Record<string, string>
}

const ASSETS_DIR = join(import.meta.dirname, '..', '..', 'web', 'dist')
const ROUTES = join(import.meta.dirname, '..', '..', 'web', 'routes.regexp')
const NGINX_CONF = join(import.meta.dirname, '..', '..', 'web', 'nginx.conf')

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

const HASHED = /-[\w]{8}\.\w+$/

function parseNginxHeaders(conf: string): Record<string, string> {
  let headers: Record<string, string> = {}
  let server = conf.slice(0, conf.indexOf('\n    location'))
  for (let m of server.matchAll(/add_header\s+(\S+)\s+"([^"]+)"/g)) {
    headers[m[1]!] = m[2]!
  }
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
  { assets } = config,
  assetsDir = ASSETS_DIR,
  routes = ROUTES,
  nginxConf = NGINX_CONF
): Promise<void> => {
  if (!assets) return
  server.logger.info('Assets serving is enabled')

  let CACHE: Record<string, Asset> = {}

  let nginxHeaders = parseNginxHeaders(await readFile(nginxConf, 'utf-8'))

  let html = await readFile(join(assetsDir, 'index.html'))
  let appHtml: Asset = {
    contentType: 'text/html',
    data: html,
    headers: nginxHeaders
  }

  let routesData = await readFile(routes)
  let routesRegexp = new RegExp(routesData.toString())

  server.http(async (req, res) => {
    if (req.method !== 'GET') return false

    let url = new URL(req.url!, `https://${req.headers.host}`)
    let pathname = url.pathname.replace(/\/$/, '')
    let safe = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
    let cacheKey = safe
    let path = join(assetsDir, safe)

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
        headers['Cache-Control'] = 'public, max-age=31536000, immutable'
      }
      if (contentType === 'text/html' && !pathname.includes('/ui')) {
        headers = nginxHeaders
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
