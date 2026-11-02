import { type EventName, sendEvents } from '@slowreader/api'

import { getEnvironment, onEnvironment } from './environment.ts'
import { hasCloud, noStatistics } from './settings.ts'
import { getServerUrl } from './sync-server.ts'

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * `daily` counts devices instead of cases without knowing any device ID.
 */
export async function track(
  name: EventName,
  opts: { daily?: boolean } = {}
): Promise<void> {
  // Local users expect the app to never contact our server
  if (!hasCloud.get() || noStatistics.get()) return
  let { persistentStore, server } = getEnvironment()
  if (opts.daily) {
    let today = getToday()
    if (persistentStore[`slowreader:event:${name}`] === today) return
    persistentStore[`slowreader:event:${name}`] = today
  }
  try {
    await sendEvents(
      { events: [name] },
      {
        credentials: 'omit',
        fetch: typeof server === 'string' ? undefined : server.fetch,
        host: getServerUrl()
      }
    )
  } catch {
    // Statistics must never break the app or show errors
  }
}

onEnvironment(({ persistentStore }) => {
  let today = getToday()
  for (let key of Object.keys(persistentStore)) {
    if (key.startsWith('slowreader:event:') && persistentStore[key] !== today) {
      delete persistentStore[key]
    }
  }
})
