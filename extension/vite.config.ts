import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

import manifest from './manifest.json'

const outDir = path.resolve(__dirname, 'dist')

export default defineConfig({
  build: {
    outDir
  },
  plugins: [react(), crx({ manifest })]
})
