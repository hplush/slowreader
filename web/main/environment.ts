import { IndexedStore } from '@logux/client'
import { windowPersistentEvents } from '@nanostores/persistent'
import { setRequestMethod, setupEnvironment } from '@slowreader/core'

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
  translationLoader: async () => ({})
})

function proxyUrl(url: string | URL): string {
  return 'http://localhost:5284/' + encodeURIComponent(url.toString())
}

let devProxy: typeof fetch = async (url, opts = {}) => {
  let originUrl: string
  if (typeof url === 'string' || url instanceof URL) {
    originUrl = url.toString()
    url = proxyUrl(url)
  } else {
    originUrl = url.url
    url = {
      ...url,
      url: proxyUrl(url.url)
    }
  }
  let response = await fetch(url, opts)
  Object.defineProperty(response, 'url', {
    value: originUrl
  })
  return response
}

setRequestMethod(devProxy)
