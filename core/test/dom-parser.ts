import { JSDOM } from 'jsdom'

global.DOMParser = new JSDOM().window.DOMParser
