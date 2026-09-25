// Self-hosted and preview deploys serve the app on `/` without landing
export const hasLanding = [
  'dev.slowreader.app',
  'localhost',
  'slowreader.app'
].includes(location.hostname)
