import type { AppMessage, ExtensionMessage } from './api.js'
import { config } from './config.js'

const FETCH_TIMEOUT_MS = 30000

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
        let data = await response.text()
        sendMessage(port, { data, type: 'fetched' })
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
