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

let server = location.hostname
let proxy = '/proxy/'
if (location.hostname === 'localhost') {
  proxy = 'http://localhost:31337/proxy/'
  server = 'localhost:31337'
} else if (location.hostname === 'slowreader.app') {
  proxy = 'https://proxy.slowreader.app/'
  proxy = 'server.slowreader.app'
} else if (location.hostname === 'dev.slowreader.app') {
  proxy = 'https://dev-proxy.slowreader.app/'
  server = 'dev-server.slowreader.app'
}

setRequestMethod(async (url, opts = {}) => {
  let originUrl = url
  let nextUrl = proxy + encodeURIComponent(url)
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
  getSession() {
    // Browser will use session from http-only cookie
    return undefined
  },
  locale,
  logStoreCreator: () => new IndexedStore(),
  networkType: detectNetworkType,
  openRoute,
  persistentEvents: windowPersistentEvents,
  persistentStore: localStorage,
  restartApp() {
    location.reload()
  },
  saveSession() {
    // Browser will keep session in http-only cookie
  },
  server,
  translationLoader() {
    return Promise.resolve({})
  },
  warn(msg) {
    // For useful messages for end-users
    // eslint-disable-next-line no-console
    console.warn(msg.message)
  }
})

router.subscribe(page => {
  if (page.redirect) {
    openRoute(page, true)
  }
})

const MOBILE_WIDTH = 1024

setIsMobile(window.innerWidth < MOBILE_WIDTH)

window
  .matchMedia(`(max-width: ${MOBILE_WIDTH}px)`)
  .addEventListener('change', (event: MediaQueryListEvent) => {
    setIsMobile(event.matches)
  })
