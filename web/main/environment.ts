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

function proxyUrl(url: string | URL): string {
  return 'http://localhost:5284/' + encodeURIComponent(url.toString())
}

let devProxy: RequestMethod = async (url, opts = {}) => {
  let originUrl = url
  let nextUrl = proxyUrl(url)
  let response = await fetch(nextUrl, opts)
  Object.defineProperty(response, 'url', {
    value: originUrl
  })
  return response
}

setRequestMethod(devProxy)

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
