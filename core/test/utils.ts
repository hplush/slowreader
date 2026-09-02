import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import { cleanStores, type ReadableAtom } from 'nanostores'
import { fail } from 'node:assert'
import { deepEqual, equal } from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  type BasePopup,
  type BaseReader,
  type BaseRoute,
  client,
  currentPage,
  enableTestTime,
  encryptionKey,
  type Environment,
  fatal,
  fastMenu,
  fastPostsCount,
  type FeedReader,
  hasPassword,
  type ListReader,
  type Loader,
  menuLoading,
  needWelcome,
  openedPopups,
  openPopup,
  type OriginPost,
  type Page,
  type Popup,
  type PopupName,
  type PostsList,
  type ReaderName,
  setLayoutType,
  setupEnvironment,
  slowMenu,
  slowPostsCount,
  subscribeUntil,
  type TextResponse,
  userId
} from '../index.ts'
import {
  getTestEnvironment,
  setBaseTestRoute,
  setWarningTracking
} from '../test.ts'

export { setupNodeDom } from '../node.ts'
export {
  checkAndRemoveRequestMock,
  expectRequest,
  getTestEnvironment,
  mockRequest,
  setBaseTestRoute,
  testSession
} from '../test.ts'

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

let testDir: string | undefined

/**
 * Database, which survives the client, like the file of the browser.
 *
 * ```js
 * enableClientTest({ databaseCreator: persistentDatabase() })
 * ```
 */
export function persistentDatabase(): Environment['databaseCreator'] {
  testDir = mkdtempSync(join(tmpdir(), 'slowreader-'))
  let file = join(testDir, 'test.sqlite')
  return () => openDb(nodeDriver(file))
}

/**
 * Set environment to run application in tests to be used in `beforeEach()`.
 *
 * Call `cleanClientTest()` in `afterEach()`.
 */
export function enableClientTest(env: Partial<Environment> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  setTestUser()
  enableTestTime()
  setBaseTestRoute({ params: {}, route: 'home' })
}

export async function cleanClientTest(): Promise<void> {
  cleanStores(
    fastMenu,
    slowMenu,
    menuLoading,
    needWelcome,
    fastPostsCount,
    slowPostsCount
  )
  await client.get()?.clean()
  client.set(undefined)
  fatal.set(undefined)
  setLayoutType('desktop')
}

/**
 * Wait until the store will have the expected value.
 *
 * Use it instead of `setTimeout()` to not depend on the machine’s speed.
 */
export function waitFor<Value>(
  store: ReadableAtom<Value>,
  check: (value: Value) => boolean,
  ms = 30000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let timeout = globalThis.setTimeout(() => {
      reject(new Error(`Store did not get the expected value in ${ms}ms`))
    }, ms)
    subscribeUntil(store, value => {
      if (!check(value)) return false
      globalThis.clearTimeout(timeout)
      resolve()
      return true
    })
  })
}

/**
 * Wait until the check will pass.
 *
 * Use it for values outside of stores instead of `setTimeout()`
 * to not depend on the machine’s speed.
 */
export async function waitUntil(
  check: () => boolean | Promise<boolean>,
  ms = 30000
): Promise<void> {
  let start = Date.now()
  while (!(await check())) {
    if (Date.now() - start > ms) {
      throw new Error(`Check did not pass in ${ms}ms`)
    }
    await setTimeout(10)
  }
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

let unbindPage: (() => void) | undefined

afterEach(() => {
  unbindPage?.()
  unbindPage = undefined
  if (testDir) {
    rmSync(testDir, { force: true, recursive: true })
    testDir = undefined
  }
})

/**
 * Change URL, check what page was opened and return page instance
 * with right types.
 */
export function openPage<SomeRoute extends BaseRoute | Omit<BaseRoute, 'hash'>>(
  route: SomeRoute
): Page<SomeRoute['route']> {
  setBaseTestRoute(route)
  // Clients keep the current page mounted. Without the subscription, `get()`
  // mounts the page only for a moment and a slow machine can unmount it
  // in the middle of the test.
  unbindPage ??= currentPage.listen(() => {})
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

function warningText(warning: unknown): string {
  if (warning instanceof Error) return `${warning.name}: ${warning.message}`
  return String(warning)
}

export function expectWarning<Result extends Promise<void> | void>(
  cb: () => Result,
  warnings: Error[]
): Result {
  let tracking: unknown[] = []
  setWarningTracking(tracking)
  function check(): void {
    deepEqual(tracking.map(warningText), warnings.map(warningText))
    setWarningTracking(undefined)
  }
  let result = cb()
  if (result) {
    return result.then(check) as Result
  } else {
    check()
    return undefined as Result
  }
}

/**
 * List’s value with generated post IDs removed, to compare it with posts
 * parsed from the feed.
 */
export function postsValue(posts: PostsList): unknown {
  let value = posts.get()
  return {
    ...value,
    list: value.list.map(post => {
      let fields: Partial<OriginPost> = { ...post }
      delete fields.id
      return fields
    })
  }
}

export function expectNotMine(loader: Loader, text: TextResponse): void {
  let title: false | string
  try {
    title = loader.isMineText(text)
  } catch {
    return
  }
  equal(title, false)
}
