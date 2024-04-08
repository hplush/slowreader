import type { TextResponse } from '../download.js'
import type { OriginPost } from '../post.js'
import { createPostsPage } from '../posts-page.js'
import type { Loader } from './index.js'
import { findLinks, hasAnyFeed } from './utils.js'

function parsePosts(text: TextResponse): OriginPost[] {
  let document = text.parse()
  return [...document.querySelectorAll('items')].map(() => ({
    full: undefined,
    media: [],
    originId: '',
    publishedAt: 1,
    title: undefined,
    url: undefined
  }))
}

export const json: Loader = {
  getMineLinksFromText(text, found) {
    let links = findLinks(text, 'application/feed+json')
    if (links.length > 0) {
      return links
    } else if (!hasAnyFeed(text, found)) {
      let { origin } = new URL(text.url)
      return [new URL('/json', origin).href]
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

  isMineText() {
    return false
  },

  isMineUrl() {
    return undefined
  }
}
