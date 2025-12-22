import {
  createDownloadTask,
  ParseError,
  type TextResponse
} from '../lib/download.ts'
import { type OriginPost, type PostMedia, stringifyMedia } from '../post.ts'
import { createPostsList } from '../posts-list.ts'
import {
  findAnchorHrefs,
  findDocumentLinks,
  findHeaderLinks,
  findMediaInText,
  type Loader,
  toTime
} from './common.ts'

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
  attachments?: JSONFeedAttachment[]
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

interface JSONFeedAttachment {
  mime_type: string
  url: string
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

function validate(text: string, value: unknown): asserts value is JsonFeed {
  if (!isObject(value)) {
    throw new ParseError('JSON feed is not an object', text)
  }

  for (let i in JSON_FEED_VALIDATORS) {
    let field = i as keyof typeof JSON_FEED_VALIDATORS
    if (!(field in value) || !JSON_FEED_VALIDATORS[field](value[field])) {
      throw new ParseError(
        `JSON feed field '${field}' is not valid with value ` +
          JSON.stringify(value[field]),
        text
      )
    }
  }
}

function parsePostSources(text: TextResponse): JsonFeedItem[] {
  let parsedJson = text.parseJson()
  validate(text.text, parsedJson)
  return parsedJson.items
}

function parsePosts(text: TextResponse): OriginPost[] {
  return parsePostSources(text).map(item => {
    let full = (item.content_html || item.content_text) ?? undefined

    let textMedia = findMediaInText(item.content_html)
    let postMedia: PostMedia[] = []
    if (item.image) {
      postMedia.push({ type: 'image', url: item.image })
    }
    if (item.banner_image) {
      postMedia.push({ type: 'image', url: item.banner_image })
    }
    for (let attachment of item.attachments ?? []) {
      if (attachment.url && attachment.mime_type) {
        postMedia.push({ type: attachment.mime_type, url: attachment.url })
      }
    }

    return {
      full,
      intro: item.summary ?? undefined,
      media: stringifyMedia([...postMedia, ...textMedia]),
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

  async getPostSource(feed, originId) {
    let json = await createDownloadTask().text(feed.url)
    return parsePostSources(json).find(i => i.id === originId)
  },

  getSuggestedLinksFromText(text) {
    return [new URL('/feed.json', new URL(text.url).origin).href]
  },

  isMineText(text) {
    let parsedJson = text.parseJson()
    validate(text.text, parsedJson)
    return parsedJson.title
  },

  isMineUrl() {
    return undefined
  }
}
