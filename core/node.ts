// DOM and requests for Node.js scripts, which run the client’s core.

import { JSDOM } from 'jsdom'

import { setRequestMethod } from './request.ts'

export const USER_AGENT = 'SlowReader/1.0 (+https://slowreader.app)'

export function setupNodeDom(): void {
  // Without URL, JSDOM has opaque origin and throws on `window.localStorage`
  let window = new JSDOM('', { url: 'https://slowreader.app/' }).window
  // @ts-expect-error JSDOM types are incomplete
  global.window = window
  global.DOMParser = window.DOMParser
  global.File = window.File
  global.ErrorEvent = window.ErrorEvent
}

export function setNodeRequestMethod(): void {
  setRequestMethod((url, opts = {}) => {
    let headers = new Headers(opts.headers)
    if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT)
    return fetch(url, { ...opts, headers })
  })
}
