import { defineConfig } from 'vite'

import { images } from './vite/images.ts'

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    emptyOutDir: true,
    outDir: '../dist',
    rolldownOptions: {
      input: 'root/root.html'
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
