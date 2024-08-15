import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'

import manifest from './manifest.json'

export default defineConfig({
  plugins: [crx({ manifest: manifest as ManifestV3Export })]
})
