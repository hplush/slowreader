// Content-Security-Policy header blocks all JS/CSS not from allow-list.
// This script is adding allow hashes for inline <script> and <style> tags
// to nginx config.

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const NGINX = join(import.meta.dirname, '../nginx.conf')
const LOADER = join(import.meta.dirname, '../dist/index.html')
const ERROR = join(import.meta.dirname, '../dist/404.html')

function hash(body: string): string {
  return `'sha256-${createHash('sha256').update(body).digest('base64')}'`
}

let [loader, error, nginx] = await Promise.all([
  readFile(LOADER, 'utf8'),
  readFile(ERROR, 'utf8'),
  readFile(NGINX, 'utf8')
])
let loaderStyles = loader.match(/<style>[\s\S]*?<\/style>/g)!
let errorCSS = error.match(/<style>[\s\S]*?<\/style>/g)!
let loaderJS = loader.match(/<script>([\s\S]*?)<\/script>/)![1]!

let hashesCSS = loaderStyles
  .concat(errorCSS)
  .map(i => hash(i.slice(7, -8)))
  .join(' ')

nginx = nginx
  .replace(/style-src ('sha\d+-[^']+'\s*)+/g, `style-src ${hashesCSS} `)
  .replace(/script-src 'sha\d+-[^']+'/g, `script-src ${hash(loaderJS)}`)

await writeFile(NGINX, nginx)
