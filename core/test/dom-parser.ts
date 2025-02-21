import { JSDOM } from 'jsdom'

let window = new JSDOM().window
// @ts-expect-error JSDOM types are incomplete
global.window = window
global.DOMParser = window.DOMParser
global.File = window.File
global.FileReader = window.FileReader
global.ErrorEvent = window.ErrorEvent
