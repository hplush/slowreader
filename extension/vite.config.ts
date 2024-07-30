import manifest from './manifest.json'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { crx } from '@crxjs/vite-plugin'

const outDir = path.resolve(__dirname, 'dist')

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir
  }
})
