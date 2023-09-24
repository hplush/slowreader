import { MemoryStore } from '@logux/core'
import { atom, cleanStores } from 'nanostores'
import { match, unreachable } from 'uvu/assert'

import {
  client,
  enableTestTime,
  type EnvironmentAndStore,
  Feed,
  Filter,
  setupEnvironment,
  userId
} from '../index.js'

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

export function enableClientTest(env: Partial<EnvironmentAndStore> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  enableTestTime()
  userId.set('10')
}

export async function cleanClientTest(): Promise<void> {
  setupEnvironment(getTestEnvironment())
  await client.get()?.log.store.clean()
  cleanStores(Feed, Filter)
}

export function getTestEnvironment(): EnvironmentAndStore {
  return {
    baseRouter: atom(undefined),
    errorEvents: { addEventListener() {} },
    locale: atom('en'),
    logStoreCreator: () => new MemoryStore(),
    networkType: () => ({ saveData: undefined, type: undefined }),
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore: {},
    translationLoader: async () => ({})
  }
}
