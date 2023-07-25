import type { ClientOptions } from '@logux/client'
import { Client } from '@logux/client'
import { TestPair, TestTime } from '@logux/core'
import { SUBPROTOCOL } from '@slowreader/api'
import { computed } from 'nanostores'

import { SlowReaderError } from '../error/index.js'
import { userId } from '../local-settings/index.js'

let testTime: TestTime | undefined

export function enableClientTest(): TestTime {
  testTime = new TestTime()
  return testTime
}

function getServer(): ClientOptions['server'] {
  return testTime ? new TestPair().left : 'ws://localhost:31337/'
}

let prevClient: Client | undefined

export const client = computed(userId, user => {
  prevClient?.destroy()

  if (user) {
    let logux = new Client({
      prefix: 'slowreader',
      server: getServer(),
      subprotocol: SUBPROTOCOL,
      time: testTime,
      userId: user
    })
    logux.start()
    logux.node.connection.disconnect()
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
