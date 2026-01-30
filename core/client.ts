import {
  type ClientOptions,
  CrossTabClient,
  encryptActions,
  status,
  type StatusValue
} from '@logux/client'
import { type ServerConnection, TestPair, TestTime } from '@logux/core'
import { deleteUser, SUBPROTOCOL } from '@slowreader/api'
import { atom, effect, onMount } from 'nanostores'

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
        logux.node.on('error', error => {
          if (error.type === 'wrong-subprotocol') {
            isOutdatedClient.set(true)
          }
        })
        /* node:coverage enable */
        logux.start(connect)
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

onMount(syncStatus, () => {
  let unbindState: (() => void) | undefined
  let unbindClient = client.subscribe(logux => {
    if (unbindState) {
      unbindState()
      unbindState = undefined
    }
    if (!logux) {
      syncStatus.set('local')
    } else {
      unbindState = status(logux, value => {
        if (
          value === 'denied' ||
          value === 'protocolError' ||
          value === 'syncError'
        ) {
          syncStatus.set('error')
        } else {
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
