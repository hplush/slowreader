import { defineConfig } from 'vite'

import { allFeatures } from '../web/vite/lightningcss.ts'
import { docPages, docs } from './vite/docs.ts'
import { images } from './vite/images.ts'
import { inlineCss } from './vite/inline-css.ts'

export default defineConfig({
  build: {
    assetsDir: 'landing',
    assetsInlineLimit: 0,
    emptyOutDir: true,
    outDir: 'dist',
    rolldownOptions: {
      input: ['root/root.html', ...docPages],
      output: {
        // Every orientation has its own size budget, see web/.size-limit.json,
        // and only its biggest image is in it
        assetFileNames(asset) {
          let source = asset.originalFileNames[0] ?? ''
          if (source.includes('/generated/small/')) {
            return 'landing/small/[name]-[hash][extname]'
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
    {
      enforce: 'post',
      // nginx and the server serve every page’s dir by index.html
      generateBundle(options, bundle) {
        for (let file of Object.values(bundle)) {
          if (file.fileName === 'root/root.html') {
            file.fileName = 'index.html'
          } else if (file.fileName.startsWith('docs/')) {
            file.fileName = file.fileName.replace(/\.html$/, '/index.html')
          }
        }
      },
      name: 'page-index'
    }
  ]
})
