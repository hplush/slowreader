// Downloading feeds by the browser extension: it goes to the feed directly,
// so no proxy sees which feeds the user reads.

import type { RequestMethod } from '@slowreader/core'
import type {
  AppMessage,
  ExtensionMessage,
  FetchAnswer
} from '@slowreader/extension/api'
import { atom } from 'nanostores'

export type ExtensionState = 'granted' | 'missing' | 'restricted'

export const extensionState = atom<ExtensionState>('missing')

/** The reminder is useful just until the page reload. */
export const installingExtension = atom(false)

function detectStore(): string {
  // TODO: Put real URL to extension
  let agent = navigator.userAgent
  if (agent.includes('Firefox')) {
    return 'https://addons.mozilla.org/'
  } else if (agent.includes('Safari') && !agent.includes('Chrome')) {
    return 'https://apps.apple.com/'
  } else {
    return 'https://chromewebstore.google.com/'
  }
}

export const extensionStore = detectStore()

let answers = new Map<number, (answer: FetchAnswer) => void>()
let lastId = 0

function post(message: AppMessage): void {
  window.postMessage(message, location.origin)
}

function fromBase64(base64: string): ArrayBuffer {
  let binary = atob(base64)
  let bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== location.origin) return
  let message = event.data as ExtensionMessage | undefined
  if (message?.to !== 'slowreader-app') return

  if (message.type === 'connected') {
    extensionState.set(message.granted ? 'granted' : 'restricted')
  } else {
    answers.get(message.id)?.(message.answer)
  }
})

export const extensionRequest: RequestMethod = (url, opts = {}) => {
  return new Promise((resolve, reject) => {
    let id = ++lastId
    let timeout = setTimeout(() => {
      answers.delete(id)
      reject(new Error('Slow Reader extension is not responding'))
    }, 35000)
    answers.set(id, answer => {
      answers.delete(id)
      clearTimeout(timeout)
      if (answer.type === 'restricted') {
        extensionState.set('restricted')
        reject(
          new Error('Slow Reader extension has no permission for the site')
        )
      } else if (answer.type === 'error') {
        reject(new Error(answer.error))
      } else {
        let response = new Response(fromBase64(answer.body), {
          headers: answer.headers,
          status: answer.status
        })
        Object.defineProperty(response, 'redirected', {
          value: answer.redirected
        })
        Object.defineProperty(response, 'url', { value: answer.url })
        resolve(response)
      }
    })
    opts.signal?.addEventListener('abort', () => {
      answers.delete(id)
      clearTimeout(timeout)
      post({ id, to: 'slowreader-extension', type: 'abort' })
      reject(opts.signal!.reason as Error)
    })
    post({
      id,
      request: {
        headers: [...new Headers(opts.headers)],
        method: opts.method ?? 'GET',
        type: 'fetch',
        url
      },
      to: 'slowreader-extension',
      type: 'request'
    })
  })
}

function ping(): void {
  post({ to: 'slowreader-extension', type: 'ping' })
}

/**
 * The content script says hello by itself, but it starts before the app’s
 * scripts. The user can also grant access in another tab.
 */
export function detectExtension(): void {
  ping()
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && extensionState.get() !== 'granted') ping()
  })
}

export function grantExtension(): void {
  post({ to: 'slowreader-extension', type: 'grant' })
}
