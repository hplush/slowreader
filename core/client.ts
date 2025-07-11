import {
  type ClientOptions,
  CrossTabClient,
  encryptActions
} from '@logux/client'
import { type ServerConnection, TestPair, TestTime } from '@logux/core'
import { SUBPROTOCOL } from '@slowreader/api'
import { atom, effect } from 'nanostores'

import { getEnvironment, onEnvironment } from './environment.ts'
import { encryptionKey, hasPassword, syncServer, userId } from './settings.ts'

let testTime: TestTime | undefined

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
        encryptActions(logux, key)
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
  if (!logux) {
    /* c8 ignore next 2 */
    throw new Error('No Slow Reader client')
  }
  return logux
}
