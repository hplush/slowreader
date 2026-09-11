import { defineConfig } from 'vite'

import { allFeatures } from '../web/vite/lightningcss.ts'
import { images } from './vite/images.ts'

export default defineConfig({
  build: {
    assetsDir: 'landing',
    assetsInlineLimit: 0,
    emptyOutDir: true,
    outDir: '../dist',
    rolldownOptions: {
      input: 'root/root.html',
      output: {
        // Only the biggest image is in the size budget, see web/.size-limit.json
        assetFileNames(asset) {
          return asset.originalFileNames.some(i =>
            i.includes('/generated/small/')
          )
            ? 'landing/small/[name]-[hash][extname]'
            : 'landing/[name]-[hash][extname]'
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
    images(),
    {
      enforce: 'post',
      // nginx and the server serve every page’s dir by index.html
      generateBundle(options, bundle) {
        for (let file of Object.values(bundle)) {
          if (file.fileName === 'root.html') file.fileName = 'index.html'
        }
      },
      name: 'page-index'
    }
  ],
  root: 'root'
})
