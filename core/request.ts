import { atom } from 'nanostores'

export interface RequestMethod {
  (url: string, opts?: RequestInit): Promise<Response>
}

export let request: RequestMethod

export function setRequestMethod(method: RequestMethod): void {
  request = method
}

export let proxyDebug = atom(false)

export function setProxyAsRequestMethod(proxyUrl: string): void {
  setRequestMethod(async (url, opts = {}) => {
    if (proxyDebug.get()) {
      let headers = new Headers(opts.headers)
      headers.set('x-slowreader-debug', '1')
      opts = { ...opts, headers }
    }
    let response = await fetch(proxyUrl + encodeURIComponent(url), opts)

    let debug = response.headers.get('x-slowreader-response-headers')
    if (debug) {
      // eslint-disable-next-line no-console
      console.log(url, JSON.parse(debug))
    }

    Object.defineProperty(response, 'url', { value: url })
    return response
  })
}
