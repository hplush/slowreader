import {
  type ClientOptions,
  CrossTabClient,
  encryptActions,
  status,
  type StatusValue
} from '@logux/client'
import { SqlLogStore } from '@logux/client/db'
import { type ServerConnection, TestPair, TestTime } from '@logux/core'
import type { Database } from '@nanostores/sql'
import { dbReset, deleteUser, SUBPROTOCOL } from '@slowreader/api'
import { delay } from 'nanodelay'
import { atom, computed, effect, onMount } from 'nanostores'

import { busyDuring } from './busy.ts'
import { getEnvironment, onEnvironment } from './environment.ts'
import { commonMessages } from './messages/index.ts'
import {
  type DatabaseFailure,
  encryptionKey,
  hasPassword,
  lastReset,
  syncServer,
  userId
} from './settings.ts'

let testTime: TestTime | undefined

/**
 * Logux uses complex time https://logux.org/guide/concepts/meta/#id-and-time
 *
 * Test time on every test run will return the same result
 * (it is more like counter, than time).
 */
export function enableTestTime(): TestTime {
  testTime = new TestTime()
  return testTime
}

function getServer(): ClientOptions['server'] {
  let server = getEnvironment().server
  if (typeof server !== 'string') {
    let pair = new TestPair()
    // @ts-expect-error Dirty mocks for tests
    pair.right.ws = {
      _socket: {
        remoteAddress: '127.0.0.1'
      },
      upgradeReq: {
        headers: {}
      }
    }
    server.addClient(pair.right as unknown as ServerConnection)
    return pair.left
  } else if (testTime) {
    return new TestPair().right
  } else {
    let domain = syncServer.get() ?? server
    let protocol = domain.startsWith('localhost') ? 'ws' : 'wss'
    return `${protocol}://${domain}`
  }
}

export const client = atom<CrossTabClient | undefined>()

/**
 * SQLite database for log and data tables.
 */
export const database = atom<Database | undefined>()

export const isOutdatedClient = atom<boolean>(false)

export const brokenDatabase = atom<DatabaseFailure | undefined>()

/**
 * Drop the local database and download the whole log from the server again.
 *
 * The server asks for it when the device was offline longer than
 * the tombstone retention window, and the client asks for it when
 * the tables are broken.
 */
export async function resetDatabase(
  reason: string,
  error?: unknown
): Promise<void> {
  let failure: DatabaseFailure = {
    at: new Date(),
    error: error instanceof Error ? error.message : undefined,
    reason
  }
  let previous = lastReset.get()
  if (
    previous &&
    reason !== 'user-request' &&
    previous.reason === reason &&
    failure.at.getTime() - previous.at.getTime() < 10 * 60 * 1000
  ) {
    brokenDatabase.set(failure)
    return
  }

  lastReset.set(failure)

  await busyDuring(
    commonMessages.get().downloadingData,
    async () => {
      let logux = getClient()
      if (logux.connected) {
        // Server stops sending new actions on `db/reset` so we are waiting
        // only client actions to be sent
        await Promise.race([logux.waitFor('synchronized'), delay(10_000)])
      }

      try {
        await Promise.race([logux.clean(), delay(10_000)])
      } catch (e) {
        getEnvironment().warn(e)
      }
    },
    true
  )
  getEnvironment().restartApp()
}

onEnvironment(({ databaseCreator }) => {
  return effect([userId, hasPassword, encryptionKey], (user, connect, key) => {
    if (user && key) {
      let db = databaseCreator()
      // Mass deletions free their pages by `freeDatabasePages()` instead of
      // long `VACUUM`. SQLite applies the mode only to a database without
      // tables, so it must be set before the log store creates its own.
      void db.exec`PRAGMA auto_vacuum = INCREMENTAL`
      let logux = new CrossTabClient({
        prefix: 'slowreader',
        server: getServer(),
        store: new SqlLogStore(db),
        subprotocol: SUBPROTOCOL,
        time: testTime,
        token: getEnvironment().getSession(),
        userId: user
      })
      encryptActions(logux, key, {
        clean: false,
        ignore: [deleteUser.type]
      })

      logux.type(dbReset, () => {
        void resetDatabase('server-request')
      })

      /* node:coverage disable */
      logux.node.catch(error => {
        if (error.type === 'wrong-subprotocol') {
          isOutdatedClient.set(true)
        }
        getEnvironment().warn(error)
      })
      if (getEnvironment().server === 'NO_SERVER') {
        logux.start(false)
      } else {
        /* node:coverage enable */
        logux.start(connect)
      }
      database.set(db)
      client.set(logux)
      return () => {
        logux.destroy()
      }
    } else {
      client.set(undefined)
      database.set(undefined)
    }
  })
})

/**
 * Run callback while the user is signed in. Return a cleanup from it: it will
 * be called on sign out, on switch to another user, and on environment change.
 */
export function onClient(
  cb: (logux: CrossTabClient) => (() => void) | void
): void {
  onEnvironment(() => effect(client, logux => (logux ? cb(logux) : undefined)))
}

export function getClient(): CrossTabClient {
  let logux = client.get()
  /* node:coverage ignore next 3 */
  if (!logux) {
    throw new Error('No Slow Reader client')
  }
  return logux
}

export type SyncStatus =
  | 'local'
  | Exclude<StatusValue, 'denied' | 'protocolError' | 'syncError'>

export const syncStatus = atom<SyncStatus>('local')
export const syncStatusType = computed(syncStatus, sync => {
  if (sync === 'error' || sync === 'wrongCredentials') {
    return 'error' as const
  } else if (
    sync === 'wait' ||
    sync === 'connectingAfterWait' ||
    sync === 'sendingAfterWait'
  ) {
    return 'wait' as const
  } else {
    return 'other' as const
  }
})
export const syncError = atom('')

onMount(syncStatus, () => {
  return effect(client, logux => {
    if (!logux) {
      syncError.set('')
      syncStatus.set('local')
      return
    }
    /* node:coverage ignore next */
    if (getEnvironment().server === 'NO_SERVER') return
    return status(logux, (value, details) => {
      if (
        value === 'denied' ||
        value === 'protocolError' ||
        value === 'syncError'
      ) {
        syncStatus.set('error')
        if (details) {
          if ('error' in details) {
            syncError.set(details.error.message)
          } else {
            syncError.set(details.action.action.type)
          }
        }
      } else {
        syncError.set('')
        syncStatus.set(value)
      }
    })
  })
})
