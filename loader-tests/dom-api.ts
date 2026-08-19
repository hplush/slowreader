import { JSDOM } from 'jsdom'

// Without URL, JSDOM has opaque origin and throws on `window.localStorage`
let window = new JSDOM('', { url: 'https://slowreader.app/' }).window
// @ts-expect-error JSDOM types are incomplete
global.window = window
global.DOMParser = window.DOMParser
