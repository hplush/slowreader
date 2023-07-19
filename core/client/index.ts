import { Client } from '@logux/client'
import { SUBPROTOCOL } from '@slowreader/api'
import { computed } from 'nanostores'

import { userId } from '../local-settings/index.js'

export let client = computed(userId, user => {
  if (user) {
    return new Client({
      prefix: 'slowreader',
      server: import.meta.env.VITE_LOGUX_URL,
      subprotocol: SUBPROTOCOL,
      userId: user
    })
  }
})
