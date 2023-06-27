import type { Source } from '../index.js'

const TYPES = new Set(['application/rss+xml', 'application/atom+xml'])

const USUAL = ['/feed', '/rss', '/atom']

function isUrl(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

export const rss: Source = {
  getMineLinksFromText(text) {
    let links = [...text.parse().querySelectorAll('link')]
      .filter(link => {
        let type = link.getAttribute('type')
        return type && TYPES.has(type) && isUrl(link.getAttribute('href'))
      })
      .map(i => i.getAttribute('href')!)
      .map(i => new URL(i, text.url).href)
    if (links.length === 0) {
      let { origin } = new URL(text.url)
      return USUAL.map(path => new URL(path, origin).href)
    } else {
      return links
    }
  },

  async getPosts() {
    return []
  },

  isMineText(text) {
    let document = text.parse()
    let root = document.firstChild?.nodeName ?? ''
    if (root === 'rss') {
      return document.querySelector('channel > title')?.textContent ?? ''
    } else if (root === 'feed') {
      return document.querySelector(':root > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
