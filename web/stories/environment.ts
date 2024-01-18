import { MemoryStore } from '@logux/core'
import {
  type BaseRoute,
  type NetworkTypeDetector,
  type RequestMethod,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'
import { atom } from 'nanostores'

export const router = atom<BaseRoute>({
  params: { category: 'general' },
  route: 'fast'
})

export const locale = atom('en')

export const persistentStore = {
  'slowreader:userId': 'user'
}

export function setNetworkType(network: ReturnType<NetworkTypeDetector>): void {
  networkType = network
}

let networkType: ReturnType<NetworkTypeDetector> = {
  saveData: false,
  type: 'free'
}

setupEnvironment({
  baseRouter: router,
  errorEvents: window,
  locale,
  logStoreCreator: () => new MemoryStore(),
  networkType() {
    return networkType
  },
  openRoute(page) {
    router.set(page)
  },
  persistentEvents: {
    addEventListener() {},
    removeEventListener() {}
  },
  persistentStore,
  restartApp() {
    console.log('App restarted')
  },
  async translationLoader() {
    return {}
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
    console.error(`No mocked response for ${url}`)
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
  responses: Record<string, PreparedResponse | string>
): void {
  preparedResponses = {}
  for (let [url, response] of Object.entries(responses)) {
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
