import {
  type BaseRoute,
  type NetworkTypeDetector,
  type RequestMethod,
  setLayoutType,
  setRequestMethod,
  setupEnvironment,
  stringifyPopups
} from '@slowreader/core'
import { getTestEnvironment } from '@slowreader/core/test'
import { atom, effect } from 'nanostores'

import { mobileMedia, tabletMedia } from '../stores/media-queries.ts'

document.getElementById('storybook-root')?.classList.add('main')

export const baseRouter = atom<BaseRoute>({
  hash: '',
  params: {},
  route: 'signUp'
})

export const locale = atom('en')

export const persistentStore = {}

export function setNetworkType(network: ReturnType<NetworkTypeDetector>): void {
  networkType = network
}

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

setupEnvironment({
  ...getTestEnvironment(),
  baseRouter,
  errorEvents: window,
  getSession() {
    return undefined
  },
  locale,
  networkType() {
    return networkType
  },
  openRoute(page) {
    baseRouter.set({ ...page, hash: stringifyPopups(page.popups) })
  },
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
