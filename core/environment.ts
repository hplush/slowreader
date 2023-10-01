import type { ClientOptions } from '@logux/client'
import type { TranslationLoader } from '@nanostores/i18n'
import {
  type PersistentEvents,
  type PersistentStore,
  setPersistentEngine
} from '@nanostores/persistent'
import type { ReadableAtom, StoreValue } from 'nanostores'

import { SlowReaderError } from './error.js'
import type { BaseRouter, Routes } from './router.js'

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
  locale: ReadableAtom<string>
  logStoreCreator: LogStoreCreator
  networkType: NetworkTypeDetector
  restartApp: () => void
  translationLoader: TranslationLoader
}

export type EnvironmentAndStore = Environment & {
  persistentEvents: PersistentEvents
  persistentStore: PersistentStore
}

let currentEnvironment: Environment | undefined

let listeners: EnvironmentListener[] = []
let unbinds: ((() => void) | void)[] = []

export function onEnvironment(ch: EnvironmentListener): void {
  if (currentEnvironment) unbinds.push(ch(currentEnvironment))
  listeners.push(ch)
}

export function setupEnvironment<Router extends BaseRouter>(
  env: EnvironmentAndStore & {
    baseRouter: ValidateRouter<Router>
  }
): void {
  for (let unbind of unbinds) unbind?.()

  setPersistentEngine(env.persistentStore, env.persistentEvents)
  currentEnvironment = {
    baseRouter: env.baseRouter,
    errorEvents: env.errorEvents,
    locale: env.locale,
    logStoreCreator: env.logStoreCreator,
    networkType: env.networkType,
    restartApp: env.restartApp,
    translationLoader: env.translationLoader
  }

  for (let listener of listeners) {
    unbinds.push(listener(currentEnvironment))
  }
}

export function getEnvironment(): Environment {
  if (!currentEnvironment) {
    throw new SlowReaderError('NoEnvironment')
  }
  return currentEnvironment
}
