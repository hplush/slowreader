import { openDb } from '@nanostores/sql'
import { wasmDriver } from '@nanostores/sql/wasm'
import { wasmWorker } from '@nanostores/sql/wasm-worker'
import {
  type BaseRoute,
  clock,
  getEnvironment,
  nightLock,
  type NetworkTypeDetector,
  type RequestMethod,
  type RouteName,
  setLayoutType,
  setRequestMethod,
  router,
  setupEnvironment,
  solveNightTask,
  stringifyPopups
} from '@slowreader/core'
import { getTestEnvironment } from '@slowreader/core/test'
import { atom, effect } from 'nanostores'

import { mobileMedia, tabletMedia } from '../stores/media-queries.ts'

document.getElementById('storybook-root')?.classList.add('main')

// Stories never sync, so Logux and busy tasks would block every reload
window.addEventListener('beforeunload', event => {
  event.stopImmediatePropagation()
})

if (!('share' in navigator)) {
  Object.defineProperty(navigator, 'share', { value: async () => {} })
}

export const baseRouter = atom<BaseRoute>({
  hash: '',
  params: {},
  route: 'signUp'
})

export const locale = atom('en')

export function lockAtNight(): void {
  nightLock.set({ enabled: true, from: 23, to: 7 })
  clock.set(new Date(2026, 0, 1, 23, 30))
}

/**
 * Route change resets the task, so the answer waits for the story’s page.
 */
export function answerNightTaskWrong(route: RouteName): void {
  let unbind = router.listen(current => {
    if (current.route !== route) return
    unbind()
    solveNightTask('0')
  })
}

export const persistentStore = {}

export function setNetworkType(network: ReturnType<NetworkTypeDetector>): void {
  networkType = network
}

export function setMediaCacheSize(size: number): void {
  mediaCacheSize = size
}

export function setPasskeySupport(support: boolean): void {
  getEnvironment().passkeySupport = support
}

let mediaCacheSize = 0

let networkType: ReturnType<NetworkTypeDetector> = {
  saveData: false,
  type: 'free'
}

effect([mobileMedia, tabletMedia], (mobile, tablet) => {
  if (mobile) {
    setLayoutType('mobile')
  } else if (tablet) {
    setLayoutType('tablet')
  } else {
    setLayoutType('desktop')
  }
})

let testEnvironment = getTestEnvironment()

setupEnvironment({
  ...testEnvironment,
  baseRouter,
  databaseCreator() {
    // SQLite deletes the config after the start
    Object.assign(globalThis, { sqlite3ApiConfig: { warn() {} } })
    let { port1, port2 } = new MessageChannel()
    void wasmWorker(sqlite3 => new sqlite3.oo1.DB(':memory:'), { port: port2 })
    return openDb(wasmDriver(port1))
  },
  dumpDatabase() {
    return Promise.resolve(new Blob(['SQLite format 3\0']))
  },
  errorEvents: window,
  getSession() {
    return undefined
  },
  locale,
  mediaCache: {
    ...testEnvironment.mediaCache,
    size() {
      return Promise.resolve(mediaCacheSize)
    }
  },
  networkType() {
    return networkType
  },
  openRoute(page) {
    baseRouter.set({ ...page, hash: stringifyPopups(page.popups) })
  },
  passkeySupport: true,
  persistentEvents: {
    addEventListener() {},
    removeEventListener() {}
  },
  persistentStore,
  restartApp() {
    console.log('App restarted')
  },
  saveSession() {},
  server: 'NO_SERVER',
  warn(e) {
    let warnings = document.getElementById('warnings')
    if (!warnings) {
      warnings = document.createElement('ul')
      warnings.id = 'warnings'
      document.getElementById('storybook-root')!.append(warnings)
    }
    let item = document.createElement('li')
    let message = e instanceof Error ? e.message : String(e)
    item.textContent = `Warning: ${message}`
    warnings.append(item)
  }
})

document.body.addEventListener('click', event => {
  let link = (event.target as Element).closest('a')
  if (
    link &&
    link.target !== '_blank' &&
    link.origin === location.origin &&
    link.rel !== 'external' &&
    link.target !== '_self'
  ) {
    event.preventDefault()
  }
})

export type PreparedResponse =
  | {
      body?: string
      contentType?: string
      status?: number
    }
  | { loading: true }

let preparedResponses: Record<string, PreparedResponse> = {}

let mockedRequest: RequestMethod = url => {
  let prepared = preparedResponses[url]
  if (prepared === undefined) prepared = preparedResponses['*']

  if (prepared === undefined) {
    return Promise.reject(new Error(`No mocked response for ${url}`))
  } else if ('loading' in prepared) {
    return new Promise(() => {})
  } else {
    let response = new Response(prepared.body ?? '', {
      headers: { 'Content-Type': prepared.contentType ?? 'text/plain' },
      status: prepared.status ?? 200
    })
    Object.defineProperty(response, 'url', { value: url })
    return Promise.resolve(response)
  }
}

export function prepareResponses(
  responses: [string, PreparedResponse | string][]
): void {
  preparedResponses = {}
  for (let [url, response] of responses) {
    if (typeof response === 'string') {
      preparedResponses[url] = {
        body: response,
        contentType: 'text/html',
        status: 200
      }
    } else {
      preparedResponses[url] = response
    }
  }
}

setRequestMethod(mockedRequest)

let originalFetch = window.fetch
window.fetch = (input, init) => {
  let url = input instanceof Request ? input.url : String(input)
  if (url.includes('NO_SERVER')) {
    return new Promise(() => {})
  }
  return originalFetch(input, init)
}

// Storybook has no permissions for the real clipboard
Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: { writeText: () => Promise.resolve() }
})
