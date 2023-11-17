import { IndexedStore } from '@logux/client'
import { windowPersistentEvents } from '@nanostores/persistent'
import {
  type RequestMethod,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'

import { detectNetworkType } from '../lib/network.js'
import { locale } from '../stores/locale.js'
import { urlRouter } from '../stores/router.js'

setupEnvironment({
  baseRouter: urlRouter,
  errorEvents: window,
  locale,
  logStoreCreator: () => new IndexedStore(),
  networkType: detectNetworkType,
  persistentEvents: windowPersistentEvents,
  persistentStore: localStorage,
  restartApp() {
    location.reload()
  },
  translationLoader: async () => ({})
})

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
