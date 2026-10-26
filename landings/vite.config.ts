import { defineConfig } from 'vite'

import { allFeatures } from '../web/vite/lightningcss.ts'
import { sbom } from '../web/vite/sbom.ts'
import { docPages, docs } from './vite/docs.ts'
import { images } from './vite/images.ts'
import { inlineCss } from './vite/inline-css.ts'
import { og } from './vite/og.ts'
import { releasePages, releases } from './vite/releases.ts'

export default defineConfig({
  build: {
    assetsDir: 'landing',
    assetsInlineLimit: 0,
    emptyOutDir: true,
    outDir: 'dist',
    rolldownOptions: {
      input: ['root/root.html', 'og/og.html', ...docPages, ...releasePages],
      output: {
        // Every orientation has its own size budget, see web/.size-limit.jsonc,
        // and only its biggest image is in it. OG page is only to render og.jpg
        assetFileNames(asset) {
          let source = asset.originalFileNames[0] ?? ''
          if (source.includes('/generated/small/')) {
            return 'landing/small/[name]-[hash][extname]'
          } else if (
            source.includes('/og/') ||
            asset.names.includes('og.css')
          ) {
            return 'landing/og/[name]-[hash][extname]'
          } else if (source.includes('-portrait.')) {
            return 'landing/portrait/[name]-[hash][extname]'
          } else {
            return 'landing/[name]-[hash][extname]'
          }
        }
      }
    }
  },
  css: {
    lightningcss: {
      exclude: allFeatures,
      targets: {}
    }
  },
  plugins: [
    docs(),
    images(),
    inlineCss(),
    og(),
    releases(),
    sbom('landing/sbom.cdx.json'),
    {
      enforce: 'post',
      // nginx and the server serve every page’s dir by index.html
      generateBundle(options, bundle) {
        for (let file of Object.values(bundle)) {
          if (file.fileName === 'root/root.html') {
            file.fileName = 'index.html'
          } else if (file.fileName === 'og/og.html') {
            file.fileName = 'og/index.html'
          } else if (
            /^(docs|releases)\//.test(file.fileName) &&
            !file.fileName.endsWith('/index.html')
          ) {
            file.fileName = file.fileName.replace(/\.html$/, '/index.html')
          }
        }
      },
      name: 'page-index'
    }
  ]
})
