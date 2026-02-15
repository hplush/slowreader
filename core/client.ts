import type {
  SyncMapChangedAction,
  SyncMapCreatedAction,
  SyncMapDeletedAction
} from '@logux/actions'
import {
  type ClientOptions,
  CrossTabClient,
  encryptActions,
  status,
  type StatusValue
} from '@logux/client'
import {
  type Action,
  type Meta,
  parseId,
  type ServerConnection,
  TestPair,
  TestTime
} from '@logux/core'
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

let prevClient: CrossTabClient | undefined
export const client = atom<CrossTabClient | undefined>()
export const isOutdatedClient = atom<boolean>(false)

function isSyncMapFieldsAction(
  action: Action
): action is SyncMapChangedAction | SyncMapCreatedAction {
  return action.type.endsWith('/changed') || action.type.endsWith('/created')
}

function isSyncMapDeleyeAction(action: Action): action is SyncMapDeletedAction {
  return action.type.endsWith('/deleted')
}

onEnvironment(({ logStoreCreator }) => {
  let unbindUser = effect(
    [userId, hasPassword, encryptionKey],
    (user, connect, key) => {
      prevClient?.destroy()

      if (user && key) {
        let logux = new CrossTabClient({
          prefix: 'slowreader',
          server: getServer(),
          store: logStoreCreator(),
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
          logux.log.changeMeta(meta.id, { reasons: [] })
        }

        logux.on('preadd', (action, meta) => {
          if (parseId(meta.id).clientId === logux.clientId) {
            meta.sync = true
          } else if (isSyncMapFieldsAction(action)) {
            let plural = action.type.split('/')[0]!
            for (let i in action.fields) {
              meta.reasons.push(`${plural}/${action.id}/${i}`)
            }
            meta.indexes = [plural, `${plural}/${action.id}`]
          } else if (isSyncMapDeleyeAction(action)) {
            let plural = action.type.split('/')[0]!
            logux.log.each({ index: `${plural}/${action.id}` }, removeAction)
          }
        })

        logux.node.on('error', error => {
          if (error.type === 'wrong-subprotocol') {
            isOutdatedClient.set(true)
          }
        })
        if (getEnvironment().server === 'NO_SERVER') {
          logux.start(false)
        } else {
          /* node:coverage enable */
          logux.start(connect)
        }
        prevClient = logux
        client.set(logux)
      } else {
        client.set(undefined)
      }
    }
  )
  return () => {
    unbindUser()
    prevClient?.destroy()
  }
})

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
export const syncStatusType = computed(syncStatus, status => {
  if (status === 'error' || status === 'wrongCredentials') {
    return 'error' as const
  } else if (
    status === 'wait' ||
    status === 'connectingAfterWait' ||
    status === 'sendingAfterWait'
  ) {
    return 'wait' as const
  } else {
    return 'other' as const
  }
})
export const syncError = atom('')

onMount(syncStatus, () => {
  let unbindState: (() => void) | undefined
  let unbindClient = client.subscribe(logux => {
    if (unbindState) {
      unbindState()
      unbindState = undefined
    }
    if (!logux) {
      syncError.set('')
      syncStatus.set('local')
    } else if (getEnvironment().server !== 'NO_SERVER') {
      unbindState = status(logux, (value, details) => {
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
    }
  })

  return () => {
    unbindClient()
    unbindState?.()
  }
})
