import { MemoryStore } from '@logux/core'
import { atom } from 'nanostores'

import type { EnvironmentAndStore } from './environment.ts'
import { type BaseRoute, stringifyPopups } from './router.ts'

export let testSession: string | undefined

const testRouter = atom<BaseRoute | undefined>()

/**
 * Ensures a route has a hash property, adding an empty string if missing.
 *
 * Syntax sugar to avoid setting `hash` in every route in tests.
 */
export function addHashToBaseRoute(
  route: BaseRoute | Omit<BaseRoute, 'hash'> | undefined
): BaseRoute | undefined {
  if (!route) return undefined
  return { hash: '', ...route } as BaseRoute
}

export function setBaseTestRoute(
  route: BaseRoute | Omit<BaseRoute, 'hash'> | undefined
): void {
  testRouter.set(addHashToBaseRoute(route))
}

export function getTestEnvironment(): EnvironmentAndStore {
  testSession = undefined

  return {
    baseRouter: testRouter,
    errorEvents: { addEventListener() {} },
    getSession() {
      return testSession
    },
    locale: atom('en'),
    logStoreCreator() {
      return new MemoryStore()
    },
    networkType() {
      return { saveData: undefined, type: undefined }
    },
    openRoute(route) {
      setBaseTestRoute({ ...route, hash: stringifyPopups(route.popups) })
    },
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore: {},
    restartApp() {},
    saveSession(session) {
      testSession = session
    },
    server: 'localhost:31337',
    translationLoader() {
      return Promise.resolve({})
    },
    warn() {}
  }
}
