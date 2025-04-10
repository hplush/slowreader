import { atom, computed } from 'nanostores'

const $tasks = atom(0)

export async function busyDuring(cb: () => Promise<void>): Promise<void> {
  $tasks.set($tasks.get() + 1)
  try {
    await cb()
  } finally {
    $tasks.set($tasks.get() - 1)
  }
}

export const busy = computed($tasks, tasks => tasks > 0)
