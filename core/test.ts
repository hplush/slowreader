import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import { delay } from 'nanodelay'
import { atom, computed } from 'nanostores'

import type { Credentials } from './auth.ts'
import type {
  CachedMedia,
  Environment,
  Network,
  PasskeySignal
} from './environment.ts'
import { type RequestMethod, setRequestMethod } from './request.ts'
import {
  type BaseRoute,
  type PopupRoute,
  type RouteName,
  type Routes,
  stringifyPopups
} from './router.ts'

export let testSession: string | undefined

/**
 * Passkey signals, which the app sent to the passkey provider.
 */
export let testSignals: PasskeySignal[] = []

/**
 * Fake browser history: every opened route, where replace changes the last one.
 */
export let testHistory: BaseRoute[] = []

/**
 * OAuth sign in pages of services, which the app opened.
 */
export let testOAuthPages: string[] = []

let testRoute = atom<BaseRoute | undefined>()

// The same listeners order as the web client with its computed router
let testRouter = computed(testRoute, route => route)

function toBaseRoute(route: {
  hash?: string
  params: object
  popups?: readonly PopupRoute[]
  route: RouteName
}): BaseRoute {
  let params: Record<string, string> = {}
  for (let [key, value] of Object.entries(route.params)) {
    if (typeof value === 'number') {
      params[key] = `${value}`
    } else if (typeof value === 'string') {
      params[key] = value
    }
  }
  return {
    hash: route.hash ?? stringifyPopups(route.popups ?? []),
    params,
    route: route.route
  }
}

let testVisible = atom(true)

let testExitListeners = new Set<() => void>()

let testNetwork = atom<Network>({
  saveData: undefined,
  type: undefined
})

/**
 * Change network, like on enabling Save Data in the system.
 */
export function setTestNetwork(network: Network): void {
  testNetwork.set(network)
}

/**
 * Show or hide the app, like on switching to another browser tab.
 */
export function setTestVisibility(visible: boolean): void {
  testVisible.set(visible)
}

/**
 * Close the app, like on closing the browser tab.
 */
export function exitTestApp(): void {
  for (let listener of testExitListeners) listener()
}

let warningTracking: undefined | unknown[]

export function setWarningTracking(tracking: undefined | unknown[]): void {
  warningTracking = tracking
}

export type TestRoute<Name extends RouteName = RouteName> = Name extends string
  ? {
      /**
       * Raw URL hash, like OAuth callback. It replaces `popups`.
       */
      hash?: string
      params: { [Param in keyof Routes[Name]]?: number | string }
      popups?: readonly PopupRoute[]
      route: Name
    }
  : never

/**
 * Opens the URL like user does by link, Back button, or in the address bar.
 */
export function openRoute(route: TestRoute | undefined, replace = false): void {
  let base = route && toBaseRoute(route)
  if (base) {
    if (replace) testHistory.pop()
    testHistory.push(base)
  }
  testRoute.set(base)
}

export function getTestEnvironment(): Environment {
  testVisible.set(true)
  testNetwork.set({ saveData: undefined, type: undefined })
  testExitListeners.clear()
  testSession = undefined
  testSignals = []
  testHistory = []
  testOAuthPages = []
  let persistentStore: Record<string, string> = {}
  let savedKey: CryptoKey | undefined
  let media = new Map<string, CachedMedia>()

  return {
    baseRouter: testRouter,
    cleanStorage() {
      for (let key in persistentStore) {
        delete persistentStore[key]
      }
      savedKey = undefined
    },
    createPasskey() {
      return Promise.resolve(undefined)
    },
    databaseCreator() {
      return openDb(nodeDriver(':memory:'))
    },
    errorEvents: { addEventListener() {} },
    getPasskey() {
      return Promise.resolve(undefined)
    },
    getSession() {
      return testSession
    },
    loadEncryptionKey() {
      return Promise.resolve(savedKey)
    },
    locale: atom('en'),
    mediaCache: {
      clear() {
        media.clear()
        return Promise.resolve()
      },
      delete(urls) {
        for (let url of urls) media.delete(url)
        return Promise.resolve()
      },
      has(url) {
        return Promise.resolve(media.has(url))
      },
      keys() {
        return Promise.resolve([...media.keys()])
      },
      async put(url, response) {
        let cached = { bytes: (await response.arrayBuffer()).byteLength }
        media.set(url, cached)
        return cached
      },
      size() {
        let total = 0
        for (let cached of media.values()) total += cached.bytes
        return Promise.resolve(total)
      }
    },
    oauthRedirect: 'http://127.0.0.1:2553/settings/accounts',
    onExit(listener) {
      testExitListeners.add(listener)
      return () => {
        testExitListeners.delete(listener)
      }
    },
    onNetwork(listener) {
      return testNetwork.subscribe(listener)
    },
    onVisibilityChange(listener) {
      return testVisible.subscribe(listener)
    },
    openOAuthPage(url) {
      testOAuthPages.push(url)
      return new Promise(() => {})
    },
    openRoute,
    passkeySupport: false,
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore,
    restartApp() {},
    saveEncryptionKey(key) {
      savedKey = key
      return Promise.resolve()
    },
    saveFile() {},
    savePassword() {
      return Promise.resolve()
    },
    saveSession(session) {
      testSession = session
    },
    server: '127.0.0.1:2554',
    signalPasskeys(signal) {
      testSignals.push(signal)
    },
    translationLoader() {
      return Promise.resolve({})
    },
    async updateClient() {},
    warn(e) {
      if (warningTracking) {
        warningTracking.push(e)
      } else {
        throw e
      }
    }
  }
}

/**
 * Useful for visual tests and cases where need reproducible result.
 */
export function testCredentials(): Credentials {
  return {
    encryptionKey: new Uint8Array(32).fill(7),
    password:
      'PDn2M6eYaGPcG5eBC231rdJ8xJB34EryNVzP1xSjadrHbViwxHNeJ4CSEa5T18YhFT',
    userId: '2750177048377147'
  }
}

export interface RequestWaiter {
  (status: number, body?: null | string, contentType?: string): Promise<void>
  aborted?: true
}

export interface RequestMock {
  andFail(): void
  andRespond(
    status: number,
    body?: null | string,
    contentType?: string,
    headers?: Record<string, string>
  ): void
  andWait(): RequestWaiter
  sent(): RequestInit
}

interface RequestExpect {
  contentType: string
  error: boolean
  headers: Record<string, string>
  opts: RequestInit | undefined
  response: null | string
  status: number
  url: string
  wait: Promise<void>
  waiter: RequestWaiter | undefined
}

let requestExpects: RequestExpect[] = []

export class MockRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MockRequestError'
  }
}

let fetchMock: RequestMethod = async (url, opts = {}) => {
  let expect = requestExpects.shift()
  if (!expect) {
    throw new MockRequestError(
      `Unexpected request ${url} ${JSON.stringify(opts)}`
    )
  } else if (expect.url !== url) {
    throw new MockRequestError(
      `Expected request ${expect.url} instead of ${url}`
    )
  }
  expect.opts = opts
  if (expect.error) {
    await delay(10)
    // Real `fetch()` throws `TypeError` on network problems
    throw new TypeError('Network Error')
  } else {
    let { promise, reject } = Promise.withResolvers()
    function abortCallback(): void {
      if (expect?.waiter) expect.waiter.aborted = true
      reject(new DOMException('', 'AbortError'))
    }

    opts.signal?.addEventListener('abort', abortCallback)
    await Promise.race([expect.wait, promise])
    opts.signal?.removeEventListener('abort', abortCallback)

    let response = new Response(expect.response, {
      headers: { 'Content-Type': expect.contentType, ...expect.headers },
      status: expect.status
    })
    Object.defineProperty(response, 'url', { value: url })
    return response
  }
}

/**
 * Enable request mocking for tests to be used in `beforeEach()`.
 *
 * Use `checkAndRemoveRequestMock()` in `afterEach()`.
 */
export function mockRequest(): void {
  requestExpects = []
  setRequestMethod(fetchMock)
}

/**
 * Mark that we are waiting HTTP request and define HTTP response
 */
export function expectRequest(url: string): RequestMock {
  let expect: RequestExpect = {
    contentType: 'text/html',
    error: false,
    headers: {},
    opts: undefined,
    response: '',
    status: 200,
    url,
    wait: Promise.resolve(),
    waiter: undefined
  }
  requestExpects.push(expect)
  return {
    /**
     * Generate network error on request
     */
    andFail() {
      expect.error = true
    },
    /**
     * Setup simple immediately response
     */
    andRespond(status, body = '', contentType = 'text/html', headers = {}) {
      expect.contentType = contentType
      expect.headers = headers
      expect.status = status
      expect.response = body
    },
    /**
     * Returns a function that allows defining response later to test latency
     */
    andWait() {
      let { promise, resolve } = Promise.withResolvers<void>()
      expect.wait = promise
      expect.waiter = (status, body = '', contentType = 'text/html') => {
        expect.contentType = contentType
        expect.status = status
        expect.response = body
        resolve()
        return delay(10)
      }
      return expect.waiter
    },
    /**
     * Options of the sent request to check its body and headers
     */
    sent() {
      if (!expect.opts) throw new Error(`${url} was not requested`)
      return expect.opts
    }
  }
}

/**
 * Fail test if there is expected request which was not sent during test
 */
export function checkAndRemoveRequestMock(): void {
  setRequestMethod(fetch)
  if (requestExpects.length > 0) {
    throw new Error(
      'Test didn’t send requests: ' + requestExpects.map(i => i.url).join(', ')
    )
  }
}
