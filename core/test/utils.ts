import { MemoryStore } from '@logux/core'
import { atom, cleanStores } from 'nanostores'

import {
  type BaseRoute,
  Category,
  client,
  enableTestTime,
  type EnvironmentAndStore,
  Feed,
  Filter,
  setupEnvironment,
  userId
} from '../index.js'

export function enableClientTest(env: Partial<EnvironmentAndStore> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  enableTestTime()
  userId.set('10')
}

export async function cleanClientTest(): Promise<void> {
  setupEnvironment(getTestEnvironment())
  await client.get()?.clean()
  cleanStores(Feed, Filter, Category)
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
    restartApp: () => {},
    translationLoader: async () => ({})
  }
}

export const testRouter = atom<BaseRoute | undefined>()

export function setBaseRoute(route: BaseRoute | undefined): void {
  testRouter.set(route)
}
