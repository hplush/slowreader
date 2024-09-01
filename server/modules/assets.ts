import type { BaseServer } from '@logux/server'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

import { getEnv } from '../env.ts'

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

export default (server: BaseServer): void => {
  let assets = getEnv(process.env).ASSETS_DIR
  if (!assets) return

  let CACHE: Record<string, { contentType: string; data: Buffer }> = {}

  server.http(async (req, res) => {
    if (req.method !== 'GET') return false

    let url = new URL(req.url ?? '', `https://${req.headers.host}`)
    let safe = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
    let path = join(assets, safe)
    let cacheKey = safe

    if (CACHE[cacheKey]) {
      let { contentType, data } = CACHE[cacheKey]
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(data)
      return true
    }

    if (!existsSync(path)) return false
    if (statSync(path).isDirectory()) {
      path = join(path, 'index.html')
    }

    let contentType = MIME_TYPES[extname(path)] || 'application/octet-stream'
    let data = await readFile(path)
    CACHE[cacheKey] = { contentType, data }

    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
    return true
  })
  server.http('GET', '/', async (req, res) => {
    let path = join(assets, 'index.html')
    if (!CACHE['/']) {
      let data = await readFile(path)
      CACHE['/'] = { contentType: 'text/html', data }
    }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(CACHE['/'].data)
  })
}
