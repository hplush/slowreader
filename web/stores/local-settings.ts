import { setLocalSettingsStorage } from '@slowreader/core'

setLocalSettingsStorage({
  get(key) {
    return localStorage.getItem(key)
  },
  set(key, value) {
    localStorage.setItem(key, value)
  },
  delete(key) {
    localStorage.removeItem(key)
  },
  subscribe(callback) {
    let listener = (e: StorageEvent): void => {
      callback(e.key, e.newValue)
    }
    window.addEventListener('storage', listener)
    return () => {
      window.removeEventListener('storage', listener)
    }
  }
})
