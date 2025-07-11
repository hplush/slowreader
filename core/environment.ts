import type { ClientOptions } from '@logux/client'
import { MemoryStore } from '@logux/core'
import type { TestServer } from '@logux/server'
import type { TranslationLoader } from '@nanostores/i18n'
import {
  type PersistentEvents,
  type PersistentStore,
  setPersistentEngine
} from '@nanostores/persistent'
import { atom, type ReadableAtom, type StoreValue } from 'nanostores'

import type {
  BaseRoute,
  BaseRouter,
  PopupRoute,
  Route,
  Routes
} from './router.ts'

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
  (env: Environment): (() => void) | void
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
  getSession(): string | undefined
  locale: ReadableAtom<string>
  logStoreCreator: LogStoreCreator
  networkType: NetworkTypeDetector
  openRoute(page: Route, redirect?: boolean): void
  restartApp(): void
  saveSession(session: string | undefined): void
  server: string | TestServer
  translationLoader: TranslationLoader
  warn(error: Error): void
}

export type EnvironmentAndStore = {
  persistentEvents: PersistentEvents
  persistentStore: PersistentStore
} & Environment

let currentEnvironment: Environment | undefined

let listeners: EnvironmentListener[] = []
let unbinds: ((() => void) | void)[] = []

function runEnvListener(listener: EnvironmentListener): void {
  unbinds.push(listener(currentEnvironment!))
}

export function onEnvironment(cb: EnvironmentListener): void {
  if (currentEnvironment) {
    /* c8 ignore next 2 */
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
    getSession: env.getSession,
    locale: env.locale,
    logStoreCreator: env.logStoreCreator,
    networkType: env.networkType,
    openRoute: env.openRoute,
    restartApp: env.restartApp,
    saveSession: env.saveSession,
    server: env.server,
    translationLoader: env.translationLoader,
    warn: env.warn
  }

  for (let listener of listeners) {
    runEnvListener(listener)
  }
}

export function getEnvironment(): Environment {
  if (!currentEnvironment) {
    /* c8 ignore next 2 */
    throw new Error('No Slow Reader environment')
  }
  return currentEnvironment
}

export const isMobile = atom<boolean | undefined>()

export function setIsMobile(isSmallScreen: boolean): void {
  isMobile.set(isSmallScreen)
}

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

/**
 * Converts popup routes to a hash string format `popup=param,popup2=param2`
 */
export function stringifyPopups(popups: PopupRoute[]): string {
  return popups
    .map(({ param, popup }) => `${popup}=${param}`)
    .filter(i => i !== '')
    .join(',')
}

let testSession: string | undefined

export function getTestEnvironment(): EnvironmentAndStore {
  return {
    baseRouter: testRouter,
    errorEvents: { addEventListener() {} },
    getSession() {
      return testSession
    },
    locale: atom('en'),
    logStoreCreator: () => new MemoryStore(),
    networkType: () => ({ saveData: undefined, type: undefined }),
    openRoute: route => {
      setBaseTestRoute({ ...route, hash: stringifyPopups(route.popups) })
    },
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore: {},
    restartApp: () => {},
    saveSession(session) {
      testSession = session
    },
    server: 'localhost:31337',
    translationLoader: () => Promise.resolve({}),
    warn: () => {}
  }
}
