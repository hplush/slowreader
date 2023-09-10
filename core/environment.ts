import type { ClientOptions } from '@logux/client'
import { MemoryStore } from '@logux/core'
import type { TranslationLoader } from '@nanostores/i18n'
import {
  type PersistentEvents,
  type PersistentStore,
  setPersistentEngine
} from '@nanostores/persistent'
import { atom, type ReadableAtom, type StoreValue } from 'nanostores'

import type { NetworkTypeDetector } from './refresh.js'
import type { BaseRouter, Routes } from './router.js'

interface LogStoreCreator {
  (): ClientOptions['store']
}

type RouterRoutes<Router extends BaseRouter> = {
  [R in Exclude<StoreValue<Router>, undefined> as R['route']]: R['params']
}

type ExactType<Good, A, B> = A extends B ? (B extends A ? Good : never) : never

type ValidateRouter<Router extends BaseRouter> = ExactType<
  Router,
  RouterRoutes<Router>,
  Routes
>

interface EnvironmentListener {
  (env: Environment): void
}

interface Environment {
  baseRouter: BaseRouter
  locale: ReadableAtom<string>
  logStoreCreator: LogStoreCreator
  networkType: NetworkTypeDetector
  translationLoader: TranslationLoader
}

let testEnvironment: Environment = {
  baseRouter: atom(undefined),
  locale: atom('en'),
  logStoreCreator: () => new MemoryStore(),
  networkType: () => ({ saveData: undefined, type: undefined }),
  translationLoader: async () => ({})
}

let currentEnvironment = { ...testEnvironment }

let listeners: EnvironmentListener[] = []

export function onEnvironment(ch: EnvironmentListener): void {
  ch(currentEnvironment)
  listeners.push(ch)
}

export function setupEnvironment<Router extends BaseRouter>(
  env: Environment & {
    baseRouter: ValidateRouter<Router>
    persistentEvents: PersistentEvents
    persistentStore: PersistentStore
  }
): void {
  setPersistentEngine(env.persistentStore, env.persistentEvents)
  currentEnvironment.baseRouter = env.baseRouter
  currentEnvironment.locale = env.locale
  currentEnvironment.logStoreCreator = env.logStoreCreator
  currentEnvironment.translationLoader = env.translationLoader
  for (let listener of listeners) {
    listener(currentEnvironment)
  }
}

export function resetTestEnvironment(): void {
  setupEnvironment({
    ...testEnvironment,
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore: {}
  })
}

export function getEnvironment(): Environment {
  return currentEnvironment
}
