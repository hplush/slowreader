import { IndexedStore } from '@logux/client'
import { windowPersistentEvents } from '@nanostores/persistent'
import {
  enableWarnings,
  type NetworkType,
  type NetworkTypeDetector,
  router,
  setIsMobile,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'

import { locale } from '../stores/locale.ts'
import { openRoute, urlRouter } from '../stores/router.ts'

enableWarnings()

let PROXY_URL: string
if (location.hostname === 'localhost') {
  PROXY_URL = 'http://localhost:31337/proxy/'
} else if (location.hostname === 'slowreader.app') {
  PROXY_URL = 'https://proxy.slowreader.app/'
} else if (location.hostname === 'dev.slowreader.app') {
  PROXY_URL = 'https://dev-proxy.slowreader.app/'
} else {
  PROXY_URL = '/proxy/'
}

setRequestMethod(async (url, opts = {}) => {
  let originUrl = url
  let nextUrl = PROXY_URL + encodeURIComponent(url.toString())
  let response = await fetch(nextUrl, opts)
  Object.defineProperty(response, 'url', {
    value: originUrl
  })
  return response
})

export const detectNetworkType: NetworkTypeDetector = () => {
  let type: NetworkType
  let saveData: boolean | undefined

  if (navigator.connection) {
    saveData = navigator.connection.saveData
    if (navigator.connection.type === 'cellular') {
      type = 'paid'
    } else if (
      navigator.connection.type === 'wifi' ||
      navigator.connection.type === 'ethernet'
    ) {
      type = 'free'
    } else {
      type = 'unknown'
    }
  }

  return { saveData, type }
}

setupEnvironment({
  baseRouter: urlRouter,
  errorEvents: window,
  locale,
  logStoreCreator: () => new IndexedStore(),
  networkType: detectNetworkType,
  openRoute,
  persistentEvents: windowPersistentEvents,
  persistentStore: localStorage,
  restartApp() {
    location.reload()
  },
  translationLoader() {
    return Promise.resolve({})
  }
})

router.subscribe(page => {
  if (page.redirect) {
    openRoute(page)
  }
})

const MOBILE_WIDTH = 1024

setIsMobile(window.innerWidth < MOBILE_WIDTH)

window
  .matchMedia(`(max-width: ${MOBILE_WIDTH}px)`)
  .addEventListener('change', (event: MediaQueryListEvent) => {
    setIsMobile(event.matches)
  })
