import type { ClientOptions } from '@logux/client'
import { Client } from '@logux/client'
import { TestPair, TestTime } from '@logux/core'
import { SUBPROTOCOL } from '@slowreader/api'
import { atom } from 'nanostores'

import { onEnvironment } from './environment.js'
import { SlowReaderError } from './error.js'
import { computeFrom, readonlyExport } from './lib/stores.js'
import { userId } from './settings.js'

let testTime: TestTime | undefined

export function enableTestTime(): TestTime {
  testTime = new TestTime()
  return testTime
}

function getServer(): ClientOptions['server'] {
  return testTime ? new TestPair().left : 'ws://localhost:31337/'
}

let prevClient: Client | undefined
let $client = atom<Client | undefined>()
export const client = readonlyExport($client)

onEnvironment(({ logStoreCreator }) => {
  let unbindUserId = computeFrom($client, [userId], user => {
    prevClient?.destroy()

    if (user) {
      let logux = new Client({
        prefix: 'slowreader',
        server: getServer(),
        store: logStoreCreator(),
        subprotocol: SUBPROTOCOL,
        time: testTime,
        userId: user
      })
      logux.start(false)
      prevClient = logux
      return logux
    } else {
      return undefined
    }
  })
  return () => {
    unbindUserId()
    prevClient?.destroy()
  }
})

export function getClient(): Client {
  let logux = client.get()
  if (!logux) {
    throw new SlowReaderError('NoClient')
  }
  return logux
}
