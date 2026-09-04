import { defineManifest } from '@crxjs/vite-plugin'

const URL =
  process.env.NODE_ENV === 'production'
    ? 'https://*.slowreader.app/*'
    : 'http://localhost:2553/*'

export default defineManifest(() => ({
  background: {
    service_worker: 'background.ts',
    type: 'module'
  },
  description: 'Companion extension for Slow Reader to speed-up feeds update',
  externally_connectable: {
    matches: [URL]
  },
  host_permissions: [URL],
  manifest_version: 3,
  name: 'Slow Reader Extension',
  version: '0.0.1'
}))
