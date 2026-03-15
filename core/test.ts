import { MemoryStore } from '@logux/core'
import { delay } from 'nanodelay'
import { atom } from 'nanostores'

import type { Credentials } from './auth.ts'
import type { EnvironmentAndStore } from './environment.ts'
import { type RequestMethod, setRequestMethod } from './request.ts'
import { type BaseRoute, stringifyPopups } from './router.ts'

export let testSession: string | undefined

const testRouter = atom<BaseRoute | undefined>()

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

export function setBaseTestRoute(
  route: BaseRoute | Omit<BaseRoute, 'hash'> | undefined
): void {
  testRouter.set(addHashToBaseRoute(route))
}

export function getTestEnvironment(): EnvironmentAndStore {
  testSession = undefined
  let persistentStore: Record<string, string> = {}

  return {
    baseRouter: testRouter,
    cleanStorage() {
      for (let key in persistentStore) {
        delete persistentStore[key]
      }
    },
    errorEvents: { addEventListener() {} },
    getSession() {
      return testSession
    },
    locale: atom('en'),
    logStoreCreator() {
      return new MemoryStore()
    },
    networkType() {
      return { saveData: undefined, type: undefined }
    },
    openRoute(route) {
      setBaseTestRoute({ ...route, hash: stringifyPopups(route.popups) })
    },
    persistentEvents: { addEventListener() {}, removeEventListener() {} },
    persistentStore,
    restartApp() {},
    saveFile() {},
    savePassword() {
      return Promise.resolve()
    },
    saveSession(session) {
      testSession = session
    },
    server: 'localhost:2554',
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
    encryptionKey: '5>@v9xbKP!',
    password: '&5$K?EJuJ=',
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
    throw new Error('Network Error')
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
