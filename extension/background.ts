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

interface Redirect {
  at: number
  from: string
  permanent: boolean
  to: string
}

/** `fetch()` follows redirects, but hides their statuses. The app moves
 * the feed only after the permanent redirect. */
let redirects = new Map<string, Redirect>()

chrome.webRequest.onBeforeRedirect.addListener(
  details => {
    let now = Date.now()
    for (let [id, redirect] of redirects) {
      if (now - redirect.at > 60_000) redirects.delete(id)
    }
    let previous = redirects.get(details.requestId)
    let status = details.statusCode
    redirects.set(details.requestId, {
      at: now,
      from: previous?.from ?? details.url,
      permanent:
        previous?.permanent !== false && (status === 301 || status === 308),
      to: details.redirectUrl
    })
  },
  { tabId: -1, urls: ['*://*/*'] }
)

function wasPermanent(from: string, to: string): boolean {
  for (let [id, redirect] of redirects) {
    if (redirect.from === from && redirect.to === to) {
      redirects.delete(id)
      return redirect.permanent
    }
  }
  return false
}

/** Firefox and Safari grant no host access on the install, and without it
 * the extension is invisible for the app. */
chrome.runtime.onInstalled.addListener(() => {
  chrome.permissions.contains({ origins: ['*://*/*'] }, granted => {
    if (!granted) void chrome.runtime.openOptionsPage()
  })
})

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
        let headers = [...response.headers]
        if (response.redirected && wasPermanent(url.href, response.url)) {
          headers.push(['x-slowreader-permanent', '1'])
        }
        send({
          body: toBase64(new Uint8Array(await response.arrayBuffer())),
          headers,
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
