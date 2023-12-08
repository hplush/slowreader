import { MemoryStore } from '@logux/core'
import {
  type BaseRoute,
  type NetworkTypeDetector,
  type RequestMethod,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'
import { atom } from 'nanostores'

export const router = atom<BaseRoute>({ params: {}, route: 'fast' })

export const locale = atom('en')

export const persistentStore = {
  'slowreader:userId': 'user'
}

export const networkType: ReturnType<NetworkTypeDetector> = {
  saveData: false,
  type: 'free'
}

setupEnvironment({
  baseRouter: router,
  errorEvents: window,
  locale,
  logStoreCreator: () => new MemoryStore(),
  networkType() {
    return networkType
  },
  persistentEvents: {
    addEventListener() {},
    removeEventListener() {}
  },
  persistentStore,
  restartApp() {
    console.log('App restarted')
  },
  async translationLoader() {
    return {}
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

let noRequest: RequestMethod = (...args) => {
  console.log('Network request', ...args)
  return new Promise(() => {})
}

setRequestMethod(noRequest)
