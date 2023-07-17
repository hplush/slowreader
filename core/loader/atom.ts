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

  async getPosts(task, url, text) {
    if (!text) text = await task.text(url)
    let document = text.parse()
    return [...document.querySelectorAll('entry')]
      .filter(entry => entry.querySelector('id')?.textContent)
      .map(entry => ({
        full: entry.querySelector('content')?.textContent ?? undefined,
        id: entry.querySelector('id')!.textContent!,
        intro: entry.querySelector('summary')?.textContent ?? undefined,
        title: entry.querySelector('title')?.textContent ?? undefined,
        url:
          entry
            .querySelector('link[rel=alternate], link:not([rel])')
            ?.getAttribute('href') ?? undefined
      }))
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
