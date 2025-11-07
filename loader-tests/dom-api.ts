import { JSDOM } from 'jsdom'

let window = new JSDOM().window
// @ts-expect-error JSDOM types are incomplete
global.window = window
global.DOMParser = window.DOMParser

if (typeof globalThis.FileReader === 'undefined') {
  // @ts-expect-error Simple polyfill
  globalThis.FileReader = class {
    onerror: (() => void) | null = null
    onload: (() => void) | null = null
    result: null | string = null

    readAsText(file: Blob): void {
      file
        .text()
        .then(text => {
          this.result = text
          this.onload?.()
        })
        .catch(() => {
          this.onerror?.()
        })
    }
  }
}
