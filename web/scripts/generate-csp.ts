// Content-Security-Policy header blocks all JS/CSS not from allow-list.
// This script is adding allow hashes for inline <script> and <style> tags
// to nginx config.

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const NGINX = join(import.meta.dirname, '../nginx.conf')
const LOADER = join(import.meta.dirname, '../dist/index.html')
const ERROR = join(import.meta.dirname, '../dist/404.html')

function hash(content: string): string {
  return `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`
}

let [loader, error, nginx] = await Promise.all([
  readFile(LOADER, 'utf8'),
  readFile(ERROR, 'utf8'),
  readFile(NGINX, 'utf8')
])
let loaderCSS = loader.match(/<style>([\s\S]*?)<\/style>/)![1]!
let errorCSS = error.match(/<style>([\s\S]*?)<\/style>/)![1]!
let loaderJS = loader.match(/<script>([\s\S]*?)<\/script>/)![1]!

nginx = nginx
  .toString()
  .replace(
    /style-src 'sha\d+-[^']+' 'sha\d+-[^']+'/g,
    `style-src ${hash(loaderCSS)} ${hash(errorCSS)}`
  )
  .replace(/script-src 'sha\d+-[^']+'/g, `script-src ${hash(loaderJS)}`)

await writeFile(NGINX, nginx)
