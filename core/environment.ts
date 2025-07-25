// Dependency Injection to change behavior in different environment
// (web, mobile native, tests, etc).

import type { ClientOptions } from '@logux/client'
import type { TestServer } from '@logux/server'
import type { TranslationLoader } from '@nanostores/i18n'
import {
  type PersistentEvents,
  type PersistentStore,
  setPersistentEngine
} from '@nanostores/persistent'
import { atom, type ReadableAtom, type StoreValue } from 'nanostores'

import type { BaseRouter, Route, Routes } from './router.ts'

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

export interface SavedPassword {
  secret: string
  userId: string
}

export interface Environment {
  /**
   * Smart store with current URL (or similar abstraction in your environment).
   */
  baseRouter: BaseRouter

  /**
   * Object like `window` in web or `process` in Node.js to track unhandled
   * errors.
   *
   * For instance, we are using it to catch not-found errors.
   */
  errorEvents: ErrorEvents

  /**
   * Restore server’s session token saves in `saveSession()`.
   */
  getSession(): string | undefined

  /**
   * Smart store taking user’s language from system.
   */
  locale: ReadableAtom<string>

  /**
   * Persistent storage for Logux log.
   */
  logStoreCreator: LogStoreCreator

  /**
   * Detect network type to not download images over expensive tariff.
   */
  networkType: NetworkTypeDetector

  /**
   * Change current URL.
   */
  openRoute(page: Route, redirect?: boolean): void

  /**
   * Restart app after sign-out to be sure that all in-memory caches are clean.
   */
  restartApp(): void

  /**
   * Save credentials to system’s password manager.
   */
  savePassword(fields: SavedPassword): Promise<void>

  /**
   * Save server’s session token to some secure storage.
   * For instance, in web we are putting it to httpOnly cookie,
   * which can’t be accessed from JS code.
   */
  saveSession(session: string | undefined): void

  /**
   * Hostname (without protocol) of default Slow Reader server.
   */
  server: string | TestServer

  /**
   * Load app’s translation. Based on Nano Stores I18n API.
   */
  translationLoader: TranslationLoader

  /**
   * Print warning to help in debugging. Should be not visible by regular user.
   */
  warn(error: Error | string): void
}

export type EnvironmentAndStore = {
  /**
   * Web `storage` event like API to subscribe for settings changes.
   */
  persistentEvents: PersistentEvents

  /**
   * `localStorage`-like API to keep per-client persistent settings.
   */
  persistentStore: PersistentStore
} & Environment

let currentEnvironment: Environment | undefined

let listeners: EnvironmentListener[] = []
let unbinds: ((() => void) | void)[] = []

function runEnvListener(listener: EnvironmentListener): void {
  unbinds.push(listener(currentEnvironment!))
}

/**
 * Wait for environment being set and re-run on every environment change.
 */
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
    savePassword: env.savePassword,
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
