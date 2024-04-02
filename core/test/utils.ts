import { cleanStores } from 'nanostores'
import { fail } from 'node:assert'

import {
  Category,
  client,
  enableTestTime,
  type EnvironmentAndStore,
  fastCategories,
  Feed,
  Filter,
  getTestEnvironment,
  Post,
  setBaseTestRoute,
  setupEnvironment,
  userId
} from '../index.js'

export function enableClientTest(env: Partial<EnvironmentAndStore> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  enableTestTime()
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
}

export async function cleanClientTest(): Promise<void> {
  cleanStores(fastCategories, Feed, Filter, Category, Post)
  await client.get()?.clean()
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
