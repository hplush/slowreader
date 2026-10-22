// Self-hosted and preview deploys serve the app on `/` without landing
export const hasLanding = [
  'dev.slowreader.app',
  '127.0.0.1',
  'localhost',
  'slowreader.app'
].includes(location.hostname)
