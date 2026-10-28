import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import type { FakeAuthenticator } from '@slowreader/server/test'
import { cleanStores, type ReadableAtom } from 'nanostores'
import { fail } from 'node:assert'
import { deepEqual, equal } from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, afterEach } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  type BasePopup,
  type BaseReader,
  client,
  type NumberPager,
  createDownloadTask,
  currentPage,
  enableTestTime,
  encryptionKey,
  encryptionKeyLost,
  type Environment,
  extensionState,
  fatal,
  fastMenu,
  fastPostsCount,
  type FeedReader,
  hasCloud,
  hasSources,
  isDemo,
  type ListReader,
  type Loader,
  type DetectedFeed,
  menuLoading,
  needWelcome,
  openedPopups,
  openPopup,
  popupsStatus,
  type OriginPost,
  type Page,
  type Popup,
  type PopupName,
  type PostsList,
  type ReaderName,
  type RouteName,
  setLayoutType,
  setupEnvironment,
  type NextPager,
  slowMenu,
  slowPostsCount,
  subscribeUntil,
  type TextResponse,
  userId,
  welcomeSteps
} from '../index.ts'
import { toEncryptionKey } from '../lib/keys.ts'
import {
  getTestEnvironment,
  openRoute,
  setWarningTracking,
  type TestRoute
} from '../test.ts'

export { setupNodeDom } from '../node.ts'
export {
  checkAndRemoveRequestMock,
  expectRequest,
  getTestEnvironment,
  mockRequest,
  openRoute,
  testHistory,
  testOAuthPages,
  testSession,
  testSignals
} from '../test.ts'

/**
 * Environment with passkeys by software authenticator.
 */
export function passkeyEnvironment(
  authenticator: FakeAuthenticator,
  requests: object[] = []
): Partial<Environment> {
  return {
    createPasskey(opts) {
      requests.push(opts)
      return Promise.resolve(
        authenticator.create({
          challenge: opts.challenge,
          prfSalt: opts.prfSalt,
          userId: opts.userId
        })
      )
    },
    getPasskey(opts) {
      requests.push(opts)
      return Promise.resolve(
        authenticator.get({
          challenge: opts.challenge,
          id: opts.allowCredentials[0]?.id,
          prfSalt: opts.prfSalt
        })
      )
    },
    passkeySupport: true
  }
}

let testKey = await toEncryptionKey(new Uint8Array(32))

export function setTestUser(enable = true): void {
  hasSources.set(undefined)
  welcomeSteps.set(undefined)
  extensionState.set('missing')
  encryptionKeyLost.set(false)
  if (enable) {
    encryptionKey.set(testKey)
    hasCloud.set(false)
    userId.set('1000000000000000')
  } else {
    // Cloud mode change re-creates the client of the signed-in user
    userId.set(undefined)
    encryptionKey.set(undefined)
    hasCloud.set(false)
  }
}

/**
 * Re-create the client like on the page reload, when the encryption key
 * is still loading from IndexedDB.
 */
export function startUserBeforeKey(): void {
  userId.set(undefined)
  encryptionKey.set(undefined)
  userId.set('1000000000000000')
}

/**
 * The browser re-runs reactive queries after the write, in another
 * message from the worker, unlike the Node driver, which updates
 * the stores inside the write.
 */
export function delayedDatabase(): Environment['databaseCreator'] {
  return () => {
    let driver = nodeDriver(':memory:')
    return openDb({
      ...driver,
      subscribe(query, params, cb, onError) {
        let timers = new Set<NodeJS.Timeout>()
        let unbind = driver.subscribe(
          query,
          params,
          rows => {
            let timer = globalThis.setTimeout(() => {
              timers.delete(timer)
              cb(rows)
            }, 20)
            timers.add(timer)
          },
          onError
        )
        return () => {
          for (let timer of timers) clearTimeout(timer)
          unbind()
        }
      }
    })
  }
}

let testDirs: string[] = []

/**
 * Database, which survives the client, like the file of the browser.
 *
 * ```js
 * startClient({ databaseCreator: persistentDatabase() })
 * ```
 */
export function persistentDatabase(): Environment['databaseCreator'] {
  let dir = mkdtempSync(join(tmpdir(), 'slowreader-'))
  testDirs.push(dir)
  let file = join(dir, 'test.sqlite')
  return () => openDb(nodeDriver(file))
}

let unbindPage: (() => void) | undefined
let unbindPopups: (() => void) | undefined

// Clients keep the page and popups mounted. Without the subscription, `get()`
// mounts the store only for a moment and a slow machine can destroy the page
// in the middle of the test.
function mountPage(): void {
  unbindPage ??= currentPage.listen(() => {})
}

function unmountPage(): void {
  unbindPage?.()
  unbindPage = undefined
  // Nanostores unmount the store with a delay, but the page should be
  // destroyed while the database is still alive
  cleanStores(currentPage)
}

function mountPopups(): void {
  unbindPopups ??= popupsStatus.listen(() => {})
}

function unmountPopups(): void {
  unbindPopups?.()
  unbindPopups = undefined
  cleanStores(popupsStatus)
}

/**
 * Set the test environment and start the client in `beforeEach()`.
 *
 * Call `cleanClient()` in `afterEach()`.
 */
export function startClient(env: Partial<Environment> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  setTestUser()
  enableTestTime()
  openRoute({ params: {}, route: 'home' })
  mountPage()
  mountPopups()
}

export async function cleanClient(): Promise<void> {
  unmountPage()
  cleanStores(
    fastMenu,
    slowMenu,
    menuLoading,
    needWelcome,
    hasSources,
    fastPostsCount,
    slowPostsCount
  )
  isDemo.set(false)
  await client.get()?.clean()
  client.set(undefined)
  fatal.set(undefined)
  setLayoutType('desktop')
  unmountPopups()
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
  { error: undefined; loading: ReadableAtom<false>; notFound: false }
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
  if (popup.error) {
    throw new Error(`Popup failed: ${popup.error}`)
  }
  return popup as Loaded<SomePopup>
}

afterEach(() => {
  unmountPage()
})

// Tests do not wait for the client to finish the writes and close the file
after(() => {
  for (let dir of testDirs) rmSync(dir, { force: true, recursive: true })
  testDirs = []
})

/**
 * Change URL, check what page was opened and return page instance
 * with right types.
 */
export function openPage<Name extends RouteName>(
  route: TestRoute<Name>
): Page<Name> {
  openRoute(route)
  // The app always listens to the current page, so redirects inside the page
  // happen only while it is mounted
  mountPage()
  let page = currentPage.get()
  if (page.route !== route.route) {
    throw new Error(`Current is ${page.route}, but ${route.route} was expected`)
  }
  return page as Page<Name>
}

/**
 * Start the client again on the route, like on the browser page reload.
 */
export function restartClient(route: TestRoute): void {
  unmountPage()
  openRoute(route)
  mountPage()
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

export function nextPagination(
  reader: FeedReader | ListReader
): NextPager['pagination'] {
  if (reader.pagination.type !== 'next') {
    throw new Error('Pagination has numbers, but next was expected')
  }
  return reader.pagination
}

export function numberPagination(
  reader: FeedReader | ListReader
): NumberPager['pagination'] {
  if (reader.pagination.type !== 'number') {
    throw new Error('Pagination has next, but numbers were expected')
  }
  return reader.pagination
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
  warnings: unknown[]
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

export async function loadedPostsValue(posts: PostsList): Promise<unknown> {
  await posts.loading
  return postsValue(posts)
}

export async function expectNotMine(
  loader: Loader,
  text: TextResponse
): Promise<void> {
  let detected: false | DetectedFeed
  try {
    detected = await loader.detectFeed(text, createDownloadTask(), text.url)
  } catch {
    return
  }
  equal(detected, false)
}
