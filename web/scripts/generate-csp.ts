// Content-Security-Policy header blocks all JS/CSS not from allow-list.
// This script is adding allow hashes for inline <script> and <style> tags
// to nginx config.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const NGINX = join(import.meta.dirname, '../nginx.conf')
const HTML = join(import.meta.dirname, '../dist/index.html')

function sha512(content: string): string {
  return createHash('sha512').update(content, 'utf8').digest('base64')
}

let html = readFileSync(HTML, 'utf8')
let css = html.match(/<style>([\s\S]*?)<\/style>/)![1]!
let js = html.match(/<script>([\s\S]*?)<\/script>/)![1]!

let nginx = readFileSync(NGINX, 'utf8')

nginx = nginx
  .toString()
  .replace(/(style-src 'sha512-)[^']+'/g, `$1${sha512(css)}'`)
  .replace(/(script-src 'sha512-)[^']+'/g, `$1${sha512(js)}'`)

writeFileSync(NGINX, nginx)
