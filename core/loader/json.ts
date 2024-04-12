import type { TextResponse } from '../download.js'
import type { OriginPost } from '../post.js'
import { createPostsPage } from '../posts-page.js'
import type { Loader } from './index.js'
import { findLinks, hasAnyFeed, toTime } from './utils.js'

// https://www.jsonfeed.org/version/1.1/
export type Author = {
  avatar?: string
  name?: string
  url?: string
}

export type Item = {
  /** deprecated from 1.1 version */
  author?: Author
  authors?: Author[]
  banner_image?: string
  content_html?: string
  content_text?: string
  date_modified?: string
  date_published?: string
  external_url?: string
  id: string
  image?: string
  summary?: string
  tags?: string[]
  title?: string
  url?: string
}

export type JsonFeed = {
  /** deprecated from 1.1 version */
  author?: Author
  authors?: Author[]
  description?: string
  favicon?: string
  feed_url?: string
  home_page_url?: string
  icon?: string
  items: Item[]
  next_url?: string
  title?: string
  user_comment?: string
  version: string
}

let existJsonFeedVersions = ['1', '1.1']

function isValidJsonFeed(json: unknown): json is JsonFeed {
  if (typeof json === 'object' && json !== null && 'version' in json) {
    let ver = (json as JsonFeed).version.split('/').pop()
    return existJsonFeedVersions.includes(ver!)
  }
  return false
}

function parsePosts(text: TextResponse): OriginPost[] {
  let jsonParsedFeed = text.parseJson()
  if (!isValidJsonFeed(jsonParsedFeed)) return []

  return jsonParsedFeed.items.map(item => ({
    full: (item.content_html || item.content_text) ?? undefined,
    intro: item.summary ?? undefined,
    media: [],
    originId: item.id,
    publishedAt: toTime(item.date_published) ?? undefined,
    title: item.title ?? '',
    url: item.url ?? undefined
  }))
}

export const json: Loader = {
  getMineLinksFromText(text, found) {
    let links = [
      findLinks(text, 'application/feed+json'),
      // check application/json media type because some websites uses this type instead standard feed+json
      findLinks(text, 'application/json')
    ].filter(i => i.length > 0)
    if (links.length > 0) {
      // if we have both types of links, we should use feed+json
      return links[0]!
    } else if (!hasAnyFeed(text, found)) {
      let { origin } = new URL(text.url)
      return [new URL('/feed.json', origin).href]
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
    let parsedJson = text.parseJson()
    if (isValidJsonFeed(parsedJson)) {
      return parsedJson.title ?? ''
    }
    return false
  },

  isMineUrl() {
    return undefined
  }
}
