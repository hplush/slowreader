// Downloading feeds by the browser extension: it goes to the feed directly,
// so no proxy sees which feeds the user reads.

import type { RequestMethod } from '@slowreader/core'
import type { AppMessage, ExtensionMessage } from '@slowreader/extension/api'
import { atom } from 'nanostores'

/**
 * Did the client find the browser extension. Without it the app can download
 * feeds only through the proxy.
 */
export const hasExtension = atom(false)

const ID = import.meta.env.VITE_EXTENSION_ID as string | undefined

function connect(): chrome.runtime.Port | undefined {
  if (!ID || typeof chrome === 'undefined' || !chrome.runtime?.connect) {
    return undefined
  }
  try {
    return chrome.runtime.connect(ID)
  } catch {
    return undefined
  }
}

function fromBase64(base64: string): ArrayBuffer {
  let binary = atob(base64)
  let bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/**
 * A port has no place for a request ID, so every request takes its own port
 * instead of guessing which answer belongs to which feed.
 */
export const extensionRequest: RequestMethod = (url, opts = {}) => {
  return new Promise((resolve, reject) => {
    let port = connect()
    if (!port) {
      reject(new Error('No Slow Reader extension'))
      return
    }
    let message: AppMessage = {
      options: { headers: [...new Headers(opts.headers)], method: opts.method },
      url
    }
    opts.signal?.addEventListener('abort', () => {
      port.disconnect()
      reject(opts.signal!.reason as Error)
    })
    port.onDisconnect.addListener(() => {
      reject(new Error('Slow Reader extension was disconnected'))
    })
    port.onMessage.addListener((answer: ExtensionMessage) => {
      if (answer.type === 'connected') {
        port.postMessage(message)
      } else if (answer.type === 'error') {
        port.disconnect()
        reject(new Error(answer.error))
      } else {
        port.disconnect()
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
  })
}

export function detectExtension(): void {
  let port = connect()
  if (!port) return
  port.onMessage.addListener((answer: ExtensionMessage) => {
    if (answer.type === 'connected') {
      hasExtension.set(true)
      port.disconnect()
    }
  })
  port.onDisconnect.addListener(() => {
    hasExtension.set(false)
  })
}
