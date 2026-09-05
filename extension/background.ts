import type { PortAnswer, PortRequest } from './api.ts'

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

chrome.runtime.onConnect.addListener(port => {
  let aborter = new AbortController()
  let alive = true

  function send(answer: PortAnswer): void {
    if (alive) port.postMessage(answer)
  }

  port.onDisconnect.addListener(() => {
    alive = false
    aborter.abort()
  })

  port.onMessage.addListener(async (message: PortRequest) => {
    if (message.type === 'check') {
      chrome.permissions.contains({ origins: ['*://*/*'] }, granted => {
        send({ granted, type: 'checked' })
      })
    } else if (message.type === 'grant') {
      void chrome.runtime.openOptionsPage()
      port.disconnect()
    } else {
      try {
        let url = new URL(message.url)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error(`Unsupported protocol ${url.protocol}`)
        }
        if (message.method !== 'GET' && message.method !== 'HEAD') {
          throw new Error(`Unsupported method ${message.method}`)
        }
        let response = await fetch(url, {
          cache: 'no-cache',
          credentials: 'omit',
          headers: message.headers.filter(([name]) => {
            return [
              'accept',
              'accept-language',
              'if-modified-since',
              'if-none-match'
            ].includes(name.toLowerCase())
          }),
          method: message.method,
          signal: AbortSignal.any([aborter.signal, AbortSignal.timeout(30000)])
        })
        send({
          body: toBase64(new Uint8Array(await response.arrayBuffer())),
          headers: [...response.headers],
          redirected: response.redirected,
          status: response.status,
          type: 'fetched',
          url: response.url
        })
      } catch (error) {
        /**
         * The user could revoke the access at any moment, and the failed
         * request is the only place where the extension can notice it.
         */
        let text = error instanceof Error ? error.toString() : String(error)
        chrome.permissions.contains({ origins: ['*://*/*'] }, granted => {
          send(
            granted ? { error: text, type: 'error' } : { type: 'restricted' }
          )
        })
      }
    }
  })
})
