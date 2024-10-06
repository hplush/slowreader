import type { ClientOptions } from '@logux/client'
import { MemoryStore } from '@logux/core'
import type { TranslationLoader } from '@nanostores/i18n'
import {
  type PersistentEvents,
  type PersistentStore,
  setPersistentEngine
} from '@nanostores/persistent'
import { atom, type ReadableAtom, type StoreValue } from 'nanostores'

import type { BaseRoute, BaseRouter, Route, Routes } from './router.ts'

interface LogStoreCreator {
  (): ClientOptions['store']
}

export type NetworkType = 'free' | 'paid' | 'unknown' | undefined

export interface NetworkTypeDetector {
  (): {
    saveData: boolean | undefined
    type: NetworkType
  }
}

type NormalizeParams<Params> = {
  [K in keyof Params]: Params[K] extends number ? Params[K] : string
}

type RouterRoutes<Router extends BaseRouter> = {
  [R in Exclude<StoreValue<Router>, undefined> as R['route']]: R['params']
}

type ExactType<Good, A, B> = A extends B ? (B extends A ? Good : never) : never

type ValidateRouter<Router extends BaseRouter> = ExactType<
  Router,
  NormalizeParams<RouterRoutes<Router>>,
  NormalizeParams<Routes>
>

interface EnvironmentListener {
  (env: Environment): (() => void)[] | (() => void) | void
}

interface ErrorEvents {
  addEventListener(
    event: 'unhandledrejection',
    listener: (event: { reason: unknown }) => void
  ): void
}

export interface Environment {
  baseRouter: BaseRouter
  errorEvents: ErrorEvents
  locale: ReadableAtom<string>
  logStoreCreator: LogStoreCreator
  networkType: NetworkTypeDetector
  openRoute(page: Route): void
  restartApp: () => void
  translationLoader: TranslationLoader
}

export type EnvironmentAndStore = {
  persistentEvents: PersistentEvents
  persistentStore: PersistentStore
} & Environment

let currentEnvironment: Environment | undefined

let listeners: EnvironmentListener[] = []
let unbinds: ((() => void) | void)[] = []

function runEnvListener(listener: EnvironmentListener): void {
  let unbind = listener(currentEnvironment!)
  if (Array.isArray(unbind)) {
    unbinds.push(...unbind)
  } else {
    unbinds.push(unbind)
  }
}

export function onEnvironment(cb: EnvironmentListener): void {
  if (currentEnvironment) {
    runEnvListener(cb)
  }
  listeners.push(cb)
}

export function setupEnvironment<Router extends BaseRouter>(
  env: {
    baseRouter: ValidateRouter<Router>
  } & EnvironmentAndStore
): void {
  for (let unbind of unbinds) unbind?.()

  setPersistentEngine(env.persistentStore, env.persistentEvents)
  currentEnvironment = {
    baseRouter: env.baseRouter,
    errorEvents: env.errorEvents,
    locale: env.locale,
    logStoreCreator: env.logStoreCreator,
    networkType: env.networkType,
    openRoute: env.openRoute,
    restartApp: env.restartApp,
    translationLoader: env.translationLoader
  }

  for (let listener of listeners) {
    runEnvListener(listener)
  }
}

export function getEnvironment(): Environment {
  if (!currentEnvironment) {
    throw new Error('No Slow Reader environment')
  }
  return currentEnvironment
}

export const isMobile = atom<boolean | undefined>()

export function setIsMobile(isSmallScreen: boolean): void {
  isMobile.set(isSmallScreen)
}

const testRouter = atom<BaseRoute | undefined>()

export function setBaseTestRoute(route: BaseRoute | undefined): void {
  testRouter.set(route)
}

export function getTestEnvironment(): EnvironmentAndStore {
  return {
    baseRouter: testRouter,
    errorEvents: { addEventListener() {} },
    locale: atom('en'),
    logStoreCreator: () => new MemoryStore(),
    networkType: () => ({ saveData: undefined, type: undefined }),
    openRoute: setBaseTestRoute,
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore: {},
    restartApp: () => {},
    translationLoader: async () => ({})
  }
}
