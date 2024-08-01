import type { AppMessage, ExtensionMessage } from './api.js'
import { config } from './config.js'

const FETCH_TIMEOUT_MS = 30000

const sendMessage = (port: chrome.runtime.Port, message: ExtensionMessage) => {
  port.postMessage(message)
}

chrome.runtime.onConnectExternal.addListener(port => {
  console.log(port)
  if (port.sender?.origin === config.HOST) {
    console.log(`connection attempt from ${config.HOST}`)
    sendMessage(port, { type: 'connected' })

    port.onMessage.addListener(async (message: AppMessage) => {
      console.log(message)
      if (message.url) {
        await fetch(message.url, {
          ...message.options,
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        })
          .then(data => {
            console.log(data)
            sendMessage(port, { data, type: 'fetched' })
          })
          .catch(error => {
            console.error(error)
            sendMessage(port, {
              data: null,
              error: error.toString(),
              type: 'error'
            })
          })
      }
      return true
    })
  }
})
