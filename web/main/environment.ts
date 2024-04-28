import { IndexedStore } from '@logux/client'
import { windowPersistentEvents } from '@nanostores/persistent'
import {
  type NetworkType,
  type NetworkTypeDetector,
  type RequestMethod,
  router,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'

import { locale } from '../stores/locale.js'
import { openRoute, urlRouter } from '../stores/router.js'

let PROXY_URL: string
if (location.hostname === 'localhost') {
  PROXY_URL = 'http://localhost:5284/'
} else if (location.hostname === 'slowreader.app') {
  PROXY_URL = 'https://proxy.slowreader.app/'
} else {
  PROXY_URL = 'https://dev-proxy.slowreader.app/'
}

let proxyRequest: RequestMethod = async (url, opts = {}) => {
  let originUrl = url
  let nextUrl = PROXY_URL + encodeURIComponent(url.toString())
  let response = await fetch(nextUrl, opts)
  Object.defineProperty(response, 'url', {
    value: originUrl
  })
  return response
}

setRequestMethod(proxyRequest)

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
  async translationLoader() {
    return {}
  }
})

router.subscribe(page => {
  if (page.redirect) {
    openRoute(page)
  }
})
