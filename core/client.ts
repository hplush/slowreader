import type { ClientOptions } from '@logux/client'
import { Client } from '@logux/client'
import { MemoryStore, TestPair, TestTime } from '@logux/core'
import { SUBPROTOCOL } from '@slowreader/api'
import { computed } from 'nanostores'

import { SlowReaderError } from './error.js'
import { userId } from './local-settings.js'

let testTime: TestTime | undefined

export function enableClientTest(): TestTime {
  testTime = new TestTime()
  return testTime
}

function getServer(): ClientOptions['server'] {
  return testTime ? new TestPair().left : 'ws://localhost:31337/'
}

export interface LogStoreCreator {
  (): ClientOptions['store']
}

let logStoreCreator: LogStoreCreator = () => new MemoryStore()

export function setLogStore(creator: LogStoreCreator): void {
  logStoreCreator = creator
}

let prevClient: Client | undefined

export const client = computed(userId, user => {
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

export function getClient(): Client {
  let logux = client.get()
  if (!logux) {
    throw new SlowReaderError('NoClient')
  }
  return logux
}
