import { Client } from '@logux/client'
import { SUBPROTOCOL } from '@slowreader/api'
import { computed } from 'nanostores'

import { userId } from '../local-settings/index.js'

let prevClient: Client | undefined

export let client = computed(userId, user => {
  prevClient?.destroy()
  if (user) {
    return new Client({
      prefix: 'slowreader',
      server: import.meta.env.VITE_LOGUX_URL,
      subprotocol: SUBPROTOCOL,
      userId: user
    })
  } else {
    return undefined
  }
})
