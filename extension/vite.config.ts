import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'

import defineManifest from './manifest.config.ts'

export default defineConfig({
  plugins: [crx({ manifest: defineManifest })]
})
