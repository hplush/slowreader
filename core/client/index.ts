import { Client } from '@logux/client'
import { SUBPROTOCOL } from '@slowreader/api'
import { computed } from 'nanostores'

import { userId } from '../local-settings/index.js'

let prevClient: Client | undefined

export let client = computed(userId, user => {
  prevClient?.destroy()
  if (user) {
    let logux = new Client({
      prefix: 'slowreader',
      server: 'ws://localhost:31337/',
      subprotocol: SUBPROTOCOL,
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
