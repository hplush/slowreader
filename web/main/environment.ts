// Dependency Injection of unique behavior for web client.

import { windowPersistentEvents } from '@nanostores/persistent'
import {
  type NetworkType,
  type NetworkTypeDetector,
  printWarning,
  router,
  setLayoutType,
  setProxyAsRequestMethod,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'
import { effect } from 'nanostores'

import {
  loadEncryptionKey,
  saveEncryptionKey,
  waitKeySaving
} from '../lib/encryption-key.ts'
import {
  createPasskey,
  getPasskey,
  passkeySupport,
  signalPasskeys
} from '../lib/passkey.ts'
import { savePassword } from '../lib/password.ts'
import { locale } from '../stores/locale.ts'
import { mobileMedia, tabletMedia } from '../stores/media-queries.ts'
import { usedRequestMethod } from '../stores/request-method.ts'
import { restarting } from '../stores/restart.ts'
import { openRoute, urlRouter } from '../stores/url-router.ts'
import { createDatabase, dumpDatabase } from './database.ts'
import { detectExtension, extensionRequest } from './extension.ts'

let server = location.hostname
let proxy = '/proxy/'
if (location.hostname === 'localhost') {
  proxy = 'http://localhost:2554/proxy/'
  server = 'localhost:2554'
} else if (location.hostname === 'slowreader.app') {
  proxy = 'https://proxy.slowreader.app/'
  server = 'server.slowreader.app'
} else if (location.hostname === 'dev.slowreader.app') {
  proxy = 'https://proxy.dev.slowreader.app/'
  server = 'server.dev.slowreader.app'
}

detectExtension()

effect(usedRequestMethod, method => {
  if (method === 'extension') {
    setRequestMethod(extensionRequest)
  } else {
    setProxyAsRequestMethod(proxy)
  }
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
  baseRouter: urlRouter,
  cleanStorage() {
    localStorage.clear()
    void saveEncryptionKey(undefined)
  },
  createPasskey,
  databaseCreator: createDatabase,
  errorEvents: window,
  dumpDatabase,
  getPasskey,
  getSession() {
    // Browser will use session from http-only cookie
    return undefined
  },
  loadEncryptionKey,
  locale,
  networkType: detectNetworkType,
  openRoute,
  passkeySupport,
  persistentEvents: windowPersistentEvents,
  persistentStore: localStorage,
  restartApp() {
    restarting.set(true)
    void waitKeySaving().then(() => {
      location.reload()
    })
  },
  saveEncryptionKey,
  saveFile(filename, content) {
    let url = URL.createObjectURL(content)
    let a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
  savePassword,
  saveSession() {
    // Browser will keep session in http-only cookie
  },
  server,
  signalPasskeys,
  translationLoader() {
    return Promise.resolve({})
  },
  updateClient() {
    location.reload()
  },
  warn(e) {
    let { details, title } = printWarning(e)
    /* eslint-disable no-console */
    console.warn(title)
    if (details.length > 0) {
      console.groupCollapsed('Details')
      for (let i of details) {
        console.log(i)
      }
      console.groupEnd()
    }
    /* eslint-enable no-console */
  }
})

router.subscribe(page => {
  if (page.redirect) {
    openRoute(page, true)
  }
})
