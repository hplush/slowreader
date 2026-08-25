// Dependency Injection to change behavior in different environment
// (web, mobile native, tests, etc).

import type { TestServer } from '@logux/server'
import type { TranslationLoader } from '@nanostores/i18n'
import {
  type PersistentEvents,
  type PersistentStore,
  setPersistentEngine
} from '@nanostores/persistent'
import type { Database } from '@nanostores/sql'
import { atom, type ReadableAtom, type StoreValue } from 'nanostores'

import type { BaseRouter, Route, Routes } from './router.ts'

interface DatabaseCreator {
  (): Database
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
   * Clean log and settings store from all data. It will be called on exit
   * or profile deletion.
   */
  cleanStorage(): void

  /**
   * SQL database engine. Like SQLocal in Web, in-memory SQLite in Node.js,
   * Expo for mobile, etc. It keeps both Logux log and app’s tables.
   */
  databaseCreator: DatabaseCreator

  /**
   * `window` in web or `process` in Node.js to track unhandled errors.
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
   * Detect network type to not download images over expensive tariff.
   */
  networkType: NetworkTypeDetector

  /**
   * Change current URL.
   */
  openRoute(page: Route, redirect?: boolean): void

  /**
   * Web `storage` event like API to subscribe for settings changes.
   */
  persistentEvents: PersistentEvents

  /**
   * `localStorage`-like API to keep per-client persistent settings
   * and Logux reducers’ data.
   */
  persistentStore: PersistentStore

  /**
   * Restart app after sign-out to be sure that all in-memory caches are clean.
   */
  restartApp(): void

  /**
   * Ask user to save file to their file system.
   */
  saveFile(filename: string, content: Blob): void

  /**
   * Save credentials to system's password manager.
   */
  savePassword(fields: SavedPassword): Promise<void>

  /**
   * Save server's session token to some secure storage.
   * For instance, in web we are putting it to httpOnly cookie,
   * which can't be accessed from JS code.
   */
  saveSession(session: string | undefined): void

  /**
   * Hostname (without protocol) of default Slow Reader server.
   *
   * For test purposes can be also TestServer instance or `"NO_SERVER"`.
   */
  server: string | TestServer

  /**
   * Load app's translation. Based on Nano Stores I18n API.
   */
  translationLoader: TranslationLoader

  /**
   * Reload page or open app store page to get latest version.
   */
  updateClient(): void

  /**
   * Print warning to help in debugging. Should be not visible by regular user.
   */
  warn(error: unknown): void
}

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
  /* node:coverage ignore next 3 */
  if (currentEnvironment) {
    runEnvListener(cb)
  }
  listeners.push(cb)
}

export function setupEnvironment<Router extends BaseRouter>(
  env: {
    baseRouter: ValidateRouter<Router>
  } & Environment
): void {
  for (let unbind of unbinds) unbind?.()

  setPersistentEngine(env.persistentStore, env.persistentEvents)
  currentEnvironment = {
    baseRouter: env.baseRouter,
    cleanStorage: env.cleanStorage,
    databaseCreator: env.databaseCreator,
    errorEvents: env.errorEvents,
    getSession: env.getSession,
    locale: env.locale,
    networkType: env.networkType,
    openRoute: env.openRoute,
    persistentEvents: env.persistentEvents,
    persistentStore: env.persistentStore,
    restartApp: env.restartApp,
    saveFile: env.saveFile,
    savePassword: env.savePassword,
    saveSession: env.saveSession,
    server: env.server,
    translationLoader: env.translationLoader,
    updateClient: env.updateClient,
    warn: env.warn
  }

  for (let listener of listeners) {
    runEnvListener(listener)
  }
}

export function getEnvironment(): Environment {
  /* node:coverage ignore next 3 */
  if (!currentEnvironment) {
    throw new Error('No Slow Reader environment')
  }
  return currentEnvironment
}

export type LayoutType = 'desktop' | 'mobile' | 'tablet'

export const layoutType = atom<LayoutType>('desktop')

export function setLayoutType(type: LayoutType): void {
  layoutType.set(type)
}
