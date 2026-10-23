import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { type ParsedPost, uniqueMedia } from '../post.ts'
import { createPostsList } from '../posts-list.ts'
import { findMRSS } from './atom.ts'
import {
  createUrlsResolver,
  fetchIfModified,
  findAnchorHrefs,
  findDocumentLinks,
  findFeedIcon,
  findHeaderLinks,
  findMediaInText,
  findXmlBase,
  type Loader,
  toAvatarUrl,
  toLang,
  toTime
} from './common.ts'

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const RSS = 'http://purl.org/rss/1.0/'
const DC = 'http://purl.org/dc/elements/1.1/'

function findChild(
  parent: Element | undefined,
  name: string,
  namespace = RSS
): Element | undefined {
  if (!parent) return undefined
  return [...parent.children].find(i => {
    return i.localName === name && i.namespaceURI === namespace
  })
}

function findRoot(text: TextResponse): Element | undefined {
  let root = text.parseXml().documentElement
  if (root.localName === 'RDF' && root.namespaceURI === RDF) {
    return root
  } else {
    return undefined
  }
}

function getOriginId(item: Element): string | undefined {
  return (
    item.getAttributeNS(RDF, 'about') ||
    findChild(item, 'link')?.textContent.trim() ||
    undefined
  )
}

function parsePostSources(text: TextResponse): Element[] {
  return [...(findRoot(text)?.children ?? [])].filter(i => {
    return i.localName === 'item' && i.namespaceURI === RSS && getOriginId(i)
  })
}

function parsePosts(
  task: DownloadTask,
  text: TextResponse
): Promise<ParsedPost[]> {
  let resolveUrls = createUrlsResolver(task)
  let lang = toLang(
    findChild(findChild(findRoot(text), 'channel'), 'language', DC)?.textContent
  )
  return Promise.all(
    parsePostSources(text).map(async item => {
      let content =
        findChild(
          item,
          'encoded',
          'http://purl.org/rss/1.0/modules/content/'
        ) ?? findChild(item, 'description')
      let url = findChild(item, 'link')?.textContent.trim() || undefined
      let full = await resolveUrls(
        content?.textContent ?? undefined,
        findXmlBase(content ?? null, text.url),
        url ?? text.url
      )
      let date = findChild(item, 'date', DC)
      return {
        full,
        ...(lang && { lang }),
        media: uniqueMedia([...findMRSS(item), ...findMediaInText(full)]),
        originId: getOriginId(item)!,
        publishedAt: toTime(date?.textContent),
        title: findChild(item, 'title')?.textContent ?? undefined,
        url
      }
    })
  )
}

export const rss1: Loader = {
  getMineLinksFromText(text) {
    let type = 'application/rdf+xml'
    return [
      ...findHeaderLinks(text, type),
      ...findDocumentLinks(text, type),
      ...findAnchorHrefs(text, /\.rdf(\?|$)/i)
    ]
  },

  getPosts(task, url, text, refreshedAt) {
    if (text) {
      return createPostsList(async () => [
        await parsePosts(task, text),
        undefined
      ])
    } else {
      return createPostsList(() =>
        fetchIfModified(task, url, refreshedAt, async response => [
          await parsePosts(task, response),
          undefined
        ])
      )
    }
  },

  async getPostSource(feed, originId) {
    let xml = await createDownloadTask().text(feed.url)
    return parsePostSources(xml).find(i => getOriginId(i) === originId)
      ?.outerHTML
  },

  getSuggestedLinksFromText() {
    return []
  },

  async loadFeedData(task, url, opts = {}) {
    let text = opts.response ?? (await task.text(url))
    let root = findRoot(text)
    // RSS 1.0 keeps <image> next to <channel>, not inside
    let image = findChild(findChild(root, 'image'), 'url')
    return {
      avatar: await findFeedIcon(
        task,
        url,
        toAvatarUrl(image?.textContent, text.url)
      ),
      title: findChild(findChild(root, 'channel'), 'title')?.textContent ?? '',
      url
    }
  },

  detectFeed(text) {
    let channel = findChild(findRoot(text), 'channel')
    if (channel) {
      return { title: findChild(channel, 'title')?.textContent ?? '' }
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
