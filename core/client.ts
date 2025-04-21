import { type ClientOptions, CrossTabClient } from '@logux/client'
import { TestPair, TestTime } from '@logux/core'
import { SUBPROTOCOL } from '@slowreader/api'
import { atom, effect } from 'nanostores'

import { onEnvironment } from './environment.ts'
import { readonlyExport } from './lib/stores.ts'
import { userId } from './settings.ts'

let testTime: TestTime | undefined

export function enableTestTime(): TestTime {
  testTime = new TestTime()
  return testTime
}

function getServer(): ClientOptions['server'] {
  return testTime ? new TestPair().left : 'ws://localhost:31338/'
}

let prevClient: CrossTabClient | undefined
let $client = atom<CrossTabClient | undefined>()
export const client = readonlyExport($client)

onEnvironment(({ logStoreCreator }) => {
  let unbindUser = effect(userId, user => {
    prevClient?.destroy()

    if (user) {
      let logux = new CrossTabClient({
        prefix: 'slowreader',
        server: getServer(),
        store: logStoreCreator(),
        subprotocol: SUBPROTOCOL,
        time: testTime,
        userId: user
      })
      logux.start(false)
      prevClient = logux
      $client.set(logux)
    } else {
      $client.set(undefined)
    }
  })
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
