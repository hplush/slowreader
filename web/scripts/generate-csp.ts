// Content-Security-Policy header blocks all JS/CSS not from allow-list.
// This script is adding allow hashes for inline <script> and <style> tags
// to nginx config.

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const NGINX = join(import.meta.dirname, '../nginx.conf')
const LOADER = join(import.meta.dirname, '../dist/index.html')
const ERROR = join(import.meta.dirname, '../dist/404.html')
const ICON = join(import.meta.dirname, '../dist/icon.svg')

function hash(body: string): string {
  return `'sha256-${createHash('sha256').update(body).digest('base64')}'`
}

let [loader, error, icon, nginx] = await Promise.all([
  readFile(LOADER, 'utf8'),
  readFile(ERROR, 'utf8'),
  readFile(ICON, 'utf8'),
  readFile(NGINX, 'utf8')
])
let loaderStyles = loader.match(/<style>[\s\S]*?<\/style>/gi)!
let errorCSS = error.match(/<style>[\s\S]*?<\/style>/gi)!
let iconCSS = icon.match(/<style>[\s\S]*?<\/style>/gi)!
let loaderJS = loader.match(/<script>([\s\S]*?)<\/script>/i)![1]!

let hashesCSS = loaderStyles
  .concat(errorCSS)
  .concat(iconCSS)
  .map(i => hash(i.slice(7, -8)))
  .join(' ')

nginx = nginx
  .replace(/style-src ('sha\d+-[^']+'\s*)+/g, `style-src ${hashesCSS} `)
  .replace(/script-src 'sha\d+-[^']+'/g, `script-src ${hash(loaderJS)}`)

await writeFile(NGINX, nginx)
