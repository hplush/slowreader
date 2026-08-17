import type {
  CrdtTableChangedAction,
  CrdtTableCreatedAction,
  CrdtTableDeletedAction
} from '@logux/actions'
import {
  type ClientOptions,
  CrossTabClient,
  encryptActions,
  status,
  type StatusValue
} from '@logux/client'
import { SqlLogStore } from '@logux/client/db'
import {
  type Action,
  type Meta,
  parseId,
  type ServerConnection,
  TestPair,
  TestTime
} from '@logux/core'
import type { Database } from '@nanostores/sql'
import { deleteUser, SUBPROTOCOL } from '@slowreader/api'
import { atom, computed, effect, onMount } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.ts'
import { encryptionKey, hasPassword, syncServer, userId } from './settings.ts'

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

type CrdtAction =
  | CrdtTableChangedAction
  | CrdtTableCreatedAction
  | CrdtTableDeletedAction

function isCrdtAction(action: Action): action is CrdtAction {
  return (
    action.type.endsWith('/created') ||
    action.type.endsWith('/changed') ||
    action.type.endsWith('/deleted')
  )
}

onEnvironment(({ databaseCreator }) => {
  return effect([userId, hasPassword, encryptionKey], (user, connect, key) => {
    if (user && key) {
      let db = databaseCreator()
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
        ignore: [deleteUser.type]
      })

      /* node:coverage disable */
      function removeAction(action: Action, meta: Meta): void {
        void logux.log.changeMeta(meta.id, { reasons: [] })
      }

      function changedRows(action: CrdtAction): [string, string[]][] {
        if ('records' in action) {
          return action.records.map(record => [
            record.id,
            Object.keys(record).filter(field => field !== 'id')
          ])
        }
        let fields = 'fields' in action ? Object.keys(action.fields) : []
        let ids = 'ids' in action ? action.ids : [action.id]
        return ids.map(id => [id, fields])
      }

      logux.on('preadd', (action, meta) => {
        if (parseId(meta.id).clientId === logux.clientId) {
          meta.sync = true
        } else if (isCrdtAction(action)) {
          let plural = action.type.split('/')[0]!
          let rows = changedRows(action)
          if (action.type.endsWith('/deleted')) {
            for (let [id] of rows) {
              void logux.log.each({ index: `${plural}/${id}` }, removeAction)
            }
          } else {
            for (let [id, fields] of rows) {
              for (let field of fields) {
                meta.reasons.push(`${plural}/${id}/${field}`)
              }
            }
            meta.indexes = [plural, ...rows.map(row => `${plural}/${row[0]}`)]
          }
        }
      })

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
