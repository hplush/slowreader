import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Features } from 'lightningcss'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sqlocal from 'sqlocal/vite'
import { defineConfig } from 'vite'

let commitTime = parseInt(execSync('git log -1 --format=%ct').toString().trim())

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

let allFeatures = 0
for (let feature in Features) {
  allFeatures |= Features[feature as keyof typeof Features]
}

export default defineConfig(() => ({
  build: {
    sourcemap: true
  },
  define: {
    COMMIT_TIME: JSON.stringify(commitTime)
  },
  css: {
    lightningcss: {
      exclude: allFeatures,
      targets: {}
    },
    transformer: 'postcss'
  },
  // SQLite could be saved to OPFS only in cross-origin isolated page.
  // Production headers are in nginx.conf.
  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  plugins: [
    svelte(),
    // `coi: false` since plugin sets require-corp, which blocks post’s images
    sqlocal({ coi: false }),
    {
      configureServer(server) {
        let csp = loadCSP()
        server.middlewares.use((req, res, next) => {
          if (req.headers.accept?.includes('text/html')) {
            res.setHeader('Content-Security-Policy', csp)
          }
          next()
        })
      },
      name: 'csp'
    },
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
  ]
}))
