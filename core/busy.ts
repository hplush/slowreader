import { atom, computed } from 'nanostores'

import { onEnvironment } from './environment.ts'
import { hasFeeds } from './feed.ts'

const $tasks = atom(0)

async function loadFeeds(): Promise<void> {
  if (hasFeeds.get() !== undefined) return
  return new Promise(resolve => {
    let unbind = hasFeeds.listen(() => {
      if (hasFeeds.get() !== undefined) {
        unbind()
        resolve()
      }
    })
  })
}

onEnvironment(() => {
  busyDuring(async () => {
    await loadFeeds()
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
