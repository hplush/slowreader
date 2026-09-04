import type { AppMessage, ExtensionMessage } from './api.ts'
import { config } from './config.ts'

const FETCH_TIMEOUT_MS = 30000

/**
 * `btoa()` takes a string, and `String.fromCharCode()` takes every byte
 * as a separate argument, so the whole feed at once overflows the call stack.
 */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
  }
  return btoa(binary)
}

function sendMessage(
  port: chrome.runtime.Port,
  message: ExtensionMessage
): void {
  port.postMessage(message)
}

chrome.runtime.onConnectExternal.addListener(port => {
  if (port.sender?.origin === config.HOST) {
    sendMessage(port, { type: 'connected' })
    port.onMessage.addListener(async (message: AppMessage) => {
      try {
        let response = await fetch(message.url, {
          ...message.options,
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        })
        sendMessage(port, {
          body: toBase64(new Uint8Array(await response.arrayBuffer())),
          headers: [...response.headers],
          redirected: response.redirected,
          status: response.status,
          type: 'fetched',
          url: response.url
        })
      } catch (error) {
        if (error instanceof Error) {
          sendMessage(port, {
            error: error.toString(),
            type: 'error'
          })
        }
      }
    })
  }
})
