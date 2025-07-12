import { atom, computed } from 'nanostores'

const $tasks = atom(0)

/**
 * Show loader over whole app until task is running.
 */
export async function busyDuring(cb: () => Promise<void>): Promise<void> {
  $tasks.set($tasks.get() + 1)
  try {
    await cb()
  } finally {
    $tasks.set($tasks.get() - 1)
  }
}

/**
 * Do we need to show loader over whole app.
 */
export const busy = computed($tasks, tasks => tasks > 0)
