import { warning } from '../devtools.ts'
import type { TextResponse } from '../download.ts'
import type { OriginPost } from '../post.ts'
import { createPostsList } from '../posts-list.ts'
import type { Loader } from './index.ts'
import {
  findAnchorHrefs,
  findDocumentLinks,
  findHeaderLinks,
  isHTML,
  toTime,
  unique
} from './utils.ts'

// https://www.jsonfeed.org/version/1.1/
interface JsonFeed {
  /** deprecated from 1.1 version */
  author?: JsonFeedAuthor
  authors?: JsonFeedAuthor[]
  description?: string
  favicon?: string
  feed_url?: string
  home_page_url?: string
  icon?: string
  items: JsonFeedItem[]
  next_url?: string
  title: string
  user_comment?: string
  version: string
}

interface JsonFeedAuthor {
  avatar?: string
  name?: string
  url?: string
}

interface JsonFeedItem {
  /** deprecated from 1.1 version */
  author?: JsonFeedAuthor
  authors?: JsonFeedAuthor[]
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

interface ValidationRules {
  [key: string]: (value: unknown) => boolean
}

const JSON_FEED_VERSIONS = ['1', '1.1']

const JSON_FEED_VALIDATORS = {
  items: value => Array.isArray(value),
  title: value => typeof value === 'string',
  version: value => {
    if (typeof value !== 'string' || !value.includes('jsonfeed')) return false
    let version = value.split('/').pop()
    return JSON_FEED_VERSIONS.includes(version!)
  }
} satisfies ValidationRules

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stringify(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function validate<ValidatedType>(
  value: unknown,
  rules: ValidationRules
): value is ValidatedType {
  if (!isObject(value)) {
    return false
  }

  for (let field in rules) {
    if (!(field in value) || !rules[field]!(value[field])) {
      warning(
        `JSON feed field '${field}' is not valid with value`,
        stringify(value[field])
      )
      return false
    }
  }

  return true
}

function parsePosts(text: TextResponse): OriginPost[] {
  let parsedJson = text.parseJson()
  if (!validate<JsonFeed>(parsedJson, JSON_FEED_VALIDATORS)) return []

  return parsedJson.items.map(item => {
    let full = (item.content_html || item.content_text) ?? undefined
    let allImages: (null | string | undefined)[] = [
      item.banner_image,
      item.image
    ]

    if (full) {
      let parser = new DOMParser()
      let fullDocument = parser.parseFromString(full, 'text/html')
      let contentImages = [...fullDocument.querySelectorAll('img')].map(
        element => element.getAttribute('src')
      )
      allImages.push(...contentImages)
    }

    return {
      full,
      intro: item.summary ?? undefined,
      media: unique(allImages),
      originId: item.id,
      publishedAt: toTime(item.date_published) ?? undefined,
      title: item.title,
      url: item.url ?? undefined
    }
  })
}

export const jsonFeed: Loader = {
  getMineLinksFromText(text) {
    let type = 'application/feed+json'
    let headerLinks = findHeaderLinks(text, type)
    if (!isHTML(text)) return headerLinks
    let linksByType = [...headerLinks, ...findDocumentLinks(text, type)]
    if (linksByType.length === 0) {
      linksByType = findDocumentLinks(text, 'application/json')
    }
    return [...linksByType, ...findAnchorHrefs(text, /feed\.json/i)]
  },

  getPosts(task, url, text) {
    if (text) {
      return createPostsList(parsePosts(text), undefined)
    } else {
      return createPostsList(undefined, async () => {
        return [parsePosts(await task.text(url)), undefined]
      })
    }
  },

  getSuggestedLinksFromText(text) {
    return [new URL('/feed.json', new URL(text.url).origin).href]
  },

  isMineText(text) {
    let parsedJson = text.parseJson()
    if (validate<JsonFeed>(parsedJson, JSON_FEED_VALIDATORS)) {
      return parsedJson.title
    }
    return false
  },

  isMineUrl() {
    return undefined
  }
}
