import { persistentAtom } from '@nanostores/persistent'

import { getEnvironment } from './environment.ts'

export const syncServer = persistentAtom<string | undefined>(
  'slowreader:server'
)

/**
 * Sync server URL for HTTP requests.
 */
export function getServerUrl(domain?: string): string {
  if (domain) {
    syncServer.set(domain)
  } else {
    let server = getEnvironment().server
    domain = syncServer.get()
    if (!domain) {
      if (typeof server !== 'string') {
        return ''
        /* node:coverage ignore next 3 */
      } else {
        domain = server
      }
    }
  }
  let protocol = /^(localhost|127\.0\.0\.1)\b/.test(domain) ? 'http' : 'https'
  return `${protocol}://${domain}`
}
