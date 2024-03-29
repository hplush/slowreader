import { MemoryStore } from '@logux/core'
import { atom, cleanStores } from 'nanostores'
import { fail } from 'node:assert'

import {
  type BaseRoute,
  Category,
  client,
  enableTestTime,
  type EnvironmentAndStore,
  fastCategories,
  Feed,
  Filter,
  Post,
  setupEnvironment,
  userId
} from '../index.js'

export function enableClientTest(env: Partial<EnvironmentAndStore> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  enableTestTime()
  userId.set('10')
  setBaseRoute({ params: {}, route: 'home' })
}

export async function cleanClientTest(): Promise<void> {
  cleanStores(fastCategories, Feed, Filter, Category, Post)
  await client.get()?.clean()
}

const testRouter = atom<BaseRoute | undefined>()

export function setBaseRoute(route: BaseRoute | undefined): void {
  testRouter.set(route)
}

export function getTestEnvironment(): EnvironmentAndStore {
  return {
    baseRouter: testRouter,
    errorEvents: { addEventListener() {} },
    locale: atom('en'),
    logStoreCreator: () => new MemoryStore(),
    networkType: () => ({ saveData: undefined, type: undefined }),
    openRoute: setBaseRoute,
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore: {},
    restartApp: () => {},
    translationLoader: async () => ({})
  }
}

interface PromiseMock<Result> {
  next(): PromiseMock<Result>
  promise(): Promise<Result>
  resolve(result: Result): void
}

export function createPromise<Result>(): PromiseMock<Result> {
  let result: PromiseMock<Result> = {
    next() {
      return createPromise<Result>()
    },
    promise() {
      return new Promise<Result>(resolve => {
        result.resolve = resolve
      })
    },
    resolve() {
      fail()
    }
  }
  return result
}
