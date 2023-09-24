import { cleanStores } from 'nanostores'
import { match, unreachable } from 'uvu/assert'

import { client, enableTestTime, Feed, Filter, userId } from '../index.js'

export async function rejects(
  wait: Promise<unknown>,
  test: ((error: Error) => void) | RegExp | string
): Promise<void> {
  try {
    await wait
    unreachable()
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }
    if (error.message === 'Assertion: Expected not to be reached!') {
      throw new Error('Error was not thrown from Promise')
    }
    if (typeof test === 'function') {
      test(error)
    } else {
      match(error.message, test)
    }
  }
}

export function enableClientTest(): void {
  enableTestTime()
  userId.set('10')
}

export async function cleanClientTest(): Promise<void> {
  await client.get()?.log.store.clean()
  cleanStores(Feed, Filter)
}
