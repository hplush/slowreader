import { cleanStores, type ReadableAtom } from 'nanostores'
import { fail } from 'node:assert'

import {
  type BasePopup,
  type BaseReader,
  type BaseRoute,
  Category,
  client,
  currentPage,
  enableTestTime,
  encryptionKey,
  type EnvironmentAndStore,
  fastMenu,
  Feed,
  type FeedReader,
  Filter,
  hasPassword,
  type ListReader,
  menuLoading,
  openedPopups,
  openPopup,
  type Page,
  type Popup,
  type PopupName,
  Post,
  type ReaderName,
  setupEnvironment,
  slowMenu,
  userId
} from '../index.ts'
import { getTestEnvironment, setBaseTestRoute } from '../test.ts'

export { getTestEnvironment, setBaseTestRoute, testSession } from '../test.ts'

export function setTestUser(enable = true): void {
  if (enable) {
    encryptionKey.set('key')
    hasPassword.set(false)
    userId.set('1000000000000000')
  } else {
    encryptionKey.set(undefined)
    hasPassword.set(false)
    userId.set(undefined)
  }
}

/**
 * Set environment to run application in tests to be used in `beforeEach()`.
 *
 * Call `cleanClientTest()` in `afterEach()`.
 */
export function enableClientTest(env: Partial<EnvironmentAndStore> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  setTestUser()
  enableTestTime()
  setBaseTestRoute({ params: {}, route: 'home' })
}

export async function cleanClientTest(): Promise<void> {
  cleanStores(Feed, Filter, Category, Post, fastMenu, slowMenu, menuLoading)
  await client.get()?.clean()
  client.set(undefined)
}

interface PromiseMock<Result> {
  next(): PromiseMock<Result>
  promise(): Promise<Result>
  resolve(result: Result): void
}

/**
 * Create fake Promise to test different stages of Promise.
 */
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

export function openTestPopup<Name extends PopupName>(
  popup: Name,
  param: string
): Popup<Name> {
  openPopup(popup, param)
  return getPopup(popup, openedPopups.get().length - 1)
}

/**
 * Check what popup was opened and return correct types.
 */
export function getPopup<Name extends PopupName>(
  name: Name,
  at = 0
): Popup<Name> {
  let popups = openedPopups.get()
  if (popups.length <= at) {
    throw new Error(
      `openedPopups has only ${popups.length} popups, but ${at} was requested`
    )
  }
  let popup = popups[at]
  if (!popup) {
    throw new Error(
      `Only ${popups.length} popups was opened. There is no ${at} index.`
    )
  }
  if (popup.name !== name) {
    throw new Error(
      `openedPopups[${at}] has name ${popup.name}, but ${name} was requested`
    )
  }
  return popup as Popup<Name>
}

export type Loaded<SomePopup extends BasePopup> = Extract<
  SomePopup,
  { loading: ReadableAtom<false>; notFound: false }
>

/**
 * Check and change popup types to loaded state.
 */
export function checkLoadedPopup<SomePopup extends BasePopup>(
  popup: SomePopup
): Loaded<SomePopup> {
  if (popup.loading.get()) {
    throw new Error('Popup is still loading')
  }
  if (popup.notFound) {
    throw new Error('Popup data was not found')
  }
  return popup as Loaded<SomePopup>
}

/**
 * Change URL, check what page was opened and return page instance
 * with right types.
 */
export function openPage<SomeRoute extends BaseRoute | Omit<BaseRoute, 'hash'>>(
  route: SomeRoute
): Page<SomeRoute['route']> {
  setBaseTestRoute(route)
  let page = currentPage.get()
  if (page.route !== route.route) {
    throw new Error(`Current is ${page.route}, but ${route.route} was expected`)
  }
  return page as Page<SomeRoute['route']>
}

/**
 * Check current reader and return it with right types.
 */
export function ensureReader<Name extends ReaderName>(
  store: ReadableAtom<BaseReader | undefined>,
  name: Name
): Name extends 'feed' ? FeedReader : ListReader {
  let reader = store.get()
  if (reader?.name !== name) {
    throw new Error(`Reader is ${reader?.name}, but ${name} was expected`)
  }
  return reader as Name extends 'feed' ? FeedReader : ListReader
}

export async function throws(cb: () => Promise<unknown>): Promise<Error> {
  let error: Error | undefined
  try {
    await cb()
  } catch (e) {
    error = e as Error
  }
  if (!error) throw new Error('Errow was not thrown')
  return error
}
