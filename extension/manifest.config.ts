import { defineManifest } from '@crxjs/vite-plugin'

const URL =
  process.env.NODE_ENV === 'production'
    ? 'https://*.slowreader.app/*'
    : 'http://localhost:5173/*'

export default defineManifest(() => ({
  background: {
    service_worker: 'background.ts',
    type: 'module'
  },
  description: 'Fetch data from websites for dev.slowreader.app',
  externally_connectable: {
    matches: [URL]
  },
  host_permissions: [URL],
  manifest_version: 3,
  name: 'Slowreader Extension',
  version: '0.0.1'
}))
