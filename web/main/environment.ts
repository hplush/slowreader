import { IndexedStore } from '@logux/client'
import { windowPersistentEvents } from '@nanostores/persistent'
import {
  type RequestMethod,
  router,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'

import { detectNetworkType } from '../lib/network.js'
import { locale } from '../stores/locale.js'
import { openURL, urlRouter } from '../stores/router.js'

setupEnvironment({
  baseRouter: urlRouter,
  errorEvents: window,
  locale,
  logStoreCreator: () => new IndexedStore(),
  networkType: detectNetworkType,
  openRoute(page) {
    // Too complex types
    // @ts-expect-error
    openURL(page.route, page.params)
  },
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
    // Too complex types
    // @ts-expect-error
    openURL(page.route, page.params)
  }
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
