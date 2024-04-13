import type { TextResponse } from '../download.js'
import type { OriginPost } from '../post.js'
import { createPostsPage } from '../posts-page.js'
import type { Loader } from './index.js'
import { findLinks, hasAnyFeed, toTime } from './utils.js'

function parsePosts(text: TextResponse): OriginPost[] {
  let document = text.parse()
  return [...document.querySelectorAll('item')]
    .filter(
      item =>
        item.querySelector('guid')?.textContent ??
        item.querySelector('link')?.textContent
    )
    .map(item => ({
      full: item.querySelector('description')?.textContent ?? undefined,
      media: [],
      originId:
        item.querySelector('guid')?.textContent ??
        item.querySelector('link')!.textContent!,
      publishedAt: toTime(item.querySelector('pubDate')?.textContent),
      title: item.querySelector('title')?.textContent ?? undefined,
      url: item.querySelector('link')?.textContent ?? undefined
    }))
}

export const rss: Loader = {
  getMineLinksFromText(text, found) {
    let links = findLinks(text, 'application/rss+xml', /\.rss|\/rss/i)
    if (links.length > 0) {
      return links
    } else if (!hasAnyFeed(text, found)) {
      let { origin } = new URL(text.url)
      return [new URL('/rss', origin).href]
    } else {
      return []
    }
  },

  getPosts(task, url, text) {
    if (text) {
      return createPostsPage(parsePosts(text), undefined)
    } else {
      return createPostsPage(undefined, async () => {
        return [parsePosts(await task.text(url)), undefined]
      })
    }
  },

  isMineText(text) {
    let document = text.parse()
    if (document.firstElementChild?.nodeName === 'rss') {
      return document.querySelector('channel > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
