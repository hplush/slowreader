import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'

function replaceIcon(html: string, icon: string): string {
  return html
    .replace('<link rel="icon" href="/favicon.ico" sizes="32x32" />', '')
    .replace(
      /<link rel="icon" href="[^"]+" type="image\/svg\+xml" \/>/,
      `<link rel="icon" href="/${icon}.svg" type="image/svg+xml" />`
    )
}

function loadCSP(): string {
  let nginxPath = join(import.meta.dirname, 'nginx.conf')
  let content = readFileSync(nginxPath, 'utf-8')
  let match = content.match(/add_header Content-Security-Policy "([^"]+)"/)
  let csp = match?.[1] ?? ''
  // Vite inserts a lot of inline <style> in development mode
  csp = csp.replace(/style-src[^;]*;?/, '')
  return csp
}

export default defineConfig(() => ({
  plugins: [
    svelte(),
    {
      enforce: 'pre',
      name: 'html-transform',
      transformIndexHtml(html) {
        if (process.env.NODE_ENV === 'development') {
          return replaceIcon(html, 'icon-dev')
        } else if (process.env.STAGING) {
          return replaceIcon(html, 'icon-staging')
        } else {
          return html
        }
      }
    }
  ],
  server: {
    headers: {
      'Content-Security-Policy': loadCSP()
    }
  }
}))
