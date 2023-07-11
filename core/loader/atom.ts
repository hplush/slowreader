import type { Loader } from '../index.js'
import { findLink } from './utils.js'

export const atom: Loader = {
  getMineLinksFromText(text) {
    let links = findLink(text, 'application/atom+xml')
    if (links.length > 0) {
      return links
    } else if (findLink(text, 'application/rss+xml').length === 0) {
      let { origin } = new URL(text.url)
      return [new URL('/atom', origin).href]
    } else {
      return []
    }
  },

  async getPosts() {
    return []
  },

  isMineText(text) {
    let document = text.parse()
    if (document.firstChild?.nodeName === 'feed') {
      return document.querySelector(':root > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
