import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import { delay } from 'nanodelay'
import { atom } from 'nanostores'

import type { Credentials } from './auth.ts'
import type { Environment, PasskeySignal } from './environment.ts'
import { type RequestMethod, setRequestMethod } from './request.ts'
import { type BaseRoute, stringifyPopups } from './router.ts'

export let testSession: string | undefined

/**
 * Passkey signals, which the app sent to the passkey provider.
 */
export let testSignals: PasskeySignal[] = []

let testRouter = atom<BaseRoute | undefined>()

let warningTracking: undefined | unknown[]

export function setWarningTracking(tracking: undefined | unknown[]): void {
  warningTracking = tracking
}

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

export function openRoute(
  route: BaseRoute | Omit<BaseRoute, 'hash'> | undefined
): void {
  testRouter.set(addHashToBaseRoute(route))
}

export function getTestEnvironment(): Environment {
  testSession = undefined
  testSignals = []
  let persistentStore: Record<string, string> = {}
  let savedKey: CryptoKey | undefined

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
      // The in-memory database is new and empty for every client, unlike
      // the file, which the browser re-opens, so the mark of the previous
      // one must go with it. Tests, which check that the database survives
      // the client, take `persistentDatabase()` from `./test/utils.ts`
      delete persistentStore['slowreader:db']
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
    networkType() {
      return { saveData: undefined, type: undefined }
    },
    openRoute(route) {
      openRoute({ ...route, hash: stringifyPopups(route.popups) })
    },
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
    server: 'localhost:2554',
    signalPasskeys(signal) {
      testSignals.push(signal)
    },
    translationLoader() {
      return Promise.resolve({})
    },
    updateClient() {},
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
  andRespond(status: number, body?: null | string, contentType?: string): void
  andWait(): RequestWaiter
}

interface RequestExpect {
  contentType: string
  error: boolean
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
    Error.captureStackTrace(this, MockRequestError)
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
  } else if (expect.error) {
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
      headers: { 'Content-Type': expect.contentType },
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
    andRespond(status, body = '', contentType = 'text/html') {
      expect.contentType = contentType
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
    }
  }
}

/**
 * Fail test if there is expected request which was not sent during test
 */
export function checkAndRemoveRequestMock(): void {
  if (requestExpects.length > 0) {
    throw new Error(
      'Test didn’t send requests: ' + requestExpects.map(i => i.url).join(', ')
    )
  }
  setRequestMethod(fetch)
}
