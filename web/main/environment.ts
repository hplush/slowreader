// Dependency Injection of unique behavior for web client.

import { IndexedStore } from '@logux/client'
import { windowPersistentEvents } from '@nanostores/persistent'
import {
  type NetworkType,
  type NetworkTypeDetector,
  router,
  setIsMobile,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'

import { locale } from '../stores/locale.ts'
import { openRoute, urlRouter } from '../stores/url-router.ts'

let server = location.hostname
let proxy = '/proxy/'
if (location.hostname === 'localhost') {
  proxy = 'http://localhost:2554/proxy/'
  server = 'localhost:2554'
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
  async savePassword(fields) {
    if (window.PasswordCredential) {
      await navigator.credentials.store(
        new window.PasswordCredential({
          id: fields.userId,
          password: fields.secret
        })
      )
    } else {
      let form = document.createElement('form')
      form.classList.add('sr-only')
      form.addEventListener('submit', e => {
        e.preventDefault()
      })
      let userInput = document.createElement('input')
      userInput.type = 'text'
      userInput.name = 'username'
      userInput.autocomplete = 'username'
      userInput.value = fields.userId
      form.appendChild(userInput)
      let passwordInput = document.createElement('input')
      passwordInput.type = 'password'
      passwordInput.name = 'password'
      passwordInput.autocomplete = 'new-password'
      passwordInput.value = fields.secret
      form.appendChild(passwordInput)
      let button = document.createElement('button')
      button.type = 'submit'
      form.appendChild(button)
      document.body.appendChild(form)
      button.click()
      setTimeout(() => {
        document.body.removeChild(form)
      }, 1000)
    }
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
    console.warn(typeof msg === 'string' ? msg : msg.message)
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
