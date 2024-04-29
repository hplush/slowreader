import { atom, computed } from 'nanostores'

import { onEnvironment } from './environment.js'
import { hasFeeds } from './feed.js'

const $tasks = atom(0)

onEnvironment(() => {
  $tasks.set($tasks.get() + 1)
  let unbind = hasFeeds.listen(has => {
    if (has !== undefined) {
      $tasks.set($tasks.get() - 1)
      unbind()
    }
  })
})

export async function busyDuring(cb: () => Promise<void>): Promise<void> {
  $tasks.set($tasks.get() + 1)
  try {
    await cb()
  } finally {
    $tasks.set($tasks.get() - 1)
  }
}

export const busy = computed($tasks, tasks => tasks > 0)
