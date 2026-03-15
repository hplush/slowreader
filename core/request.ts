import { atom } from 'nanostores'

export interface RequestMethod {
  (url: string, opts?: RequestInit): Promise<Response>
}

export let request: RequestMethod

export function setRequestMethod(method: RequestMethod): void {
  request = method
}

export let proxyDebug = atom<((headers: Headers) => void) | false>(false)

export function setProxyAsRequestMethod(proxyUrl: string): void {
  setRequestMethod(async (url, opts = {}) => {
    let debug = proxyDebug.get()
    if (debug) {
      let headers = new Headers(opts.headers)
      headers.set('x-slowreader-debug', '1')
      opts = { ...opts, headers }
    }
    let response = await fetch(proxyUrl + encodeURIComponent(url), opts)
    if (debug) debug(response.headers)

    Object.defineProperty(response, 'url', { value: url })
    return response
  })
}
