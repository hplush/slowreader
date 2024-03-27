import type { TextResponse } from '../download.js'
import type { OriginPost } from '../post.js'
import { createPostsPage } from '../posts-page.js'
import type { Loader } from './index.js'
import { findLinks, hasAnyFeed, toTime } from './utils.js'

function parsePosts(text: TextResponse): OriginPost[] {
  let document = text.parse()
  return [...document.querySelectorAll('entry')]
    .filter(entry => entry.querySelector('id')?.textContent)
    .map(entry => ({
      full: entry.querySelector('content')?.textContent ?? undefined,
      intro: entry.querySelector('summary')?.textContent ?? undefined,
      media: [],
      originId: entry.querySelector('id')!.textContent!,
      publishedAt: toTime(
        entry.querySelector('published')?.textContent ??
          entry.querySelector('updated')?.textContent
      ),
      title: entry.querySelector('title')?.textContent ?? undefined,
      url:
        entry
          .querySelector('link[rel=alternate], link:not([rel])')
          ?.getAttribute('href') ?? undefined
    }))
}

export const atom: Loader = {
  getMineLinksFromText(text, found) {
    let links = findLinks(text, 'application/atom+xml')
    if (links.length > 0) {
      return links
    } else if (!hasAnyFeed(text, found)) {
      let { origin } = new URL(text.url)
      return [new URL('/atom', origin).href]
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
    if (document.firstElementChild?.nodeName === 'feed') {
      return document.querySelector(':root > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
