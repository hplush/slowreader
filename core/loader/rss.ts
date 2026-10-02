import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { type ParsedPost, type PostMedia, stringifyMedia } from '../post.ts'
import { createPostsList } from '../posts-list.ts'
import { findMRSS } from './atom.ts'
import {
  createImagesResolver,
  fetchIfModified,
  findAnchorHrefs,
  findDocumentLinks,
  findHeaderLinks,
  findMediaInText,
  findXmlBase,
  type Loader,
  toTime
} from './common.ts'

function parsePostSources(text: TextResponse): Element[] {
  let document = text.parseXml()
  return [...document.querySelectorAll('item')].filter(
    item =>
      item.querySelector('guid')?.textContent ??
      item.querySelector('link')?.textContent
  )
}

function parsePosts(
  task: DownloadTask,
  text: TextResponse
): Promise<ParsedPost[]> {
  let resolveImages = createImagesResolver(task)
  return Promise.all(
    parsePostSources(text).map(async item => {
      let description = item.querySelector('description')
      let url = item.querySelector('link')?.textContent ?? undefined
      let full = await resolveImages(
        description?.textContent ?? undefined,
        findXmlBase(description, text.url),
        url ?? text.url
      )

      let textMedia = findMediaInText(full)
      let postMedia: PostMedia[] = []
      let enclosures = item.querySelectorAll('enclosure')
      for (let enclosure of enclosures) {
        let enclosureUrl = enclosure.getAttribute('url')
        let type = enclosure.getAttribute('type')
        if (enclosureUrl && type) {
          postMedia.push({ type, url: enclosureUrl })
        }
      }
      postMedia = postMedia.concat(findMRSS(item))

      return {
        full,
        media: stringifyMedia([...postMedia, ...textMedia]),
        originId:
          item.querySelector('guid')?.textContent ??
          item.querySelector('link')!.textContent,
        publishedAt: toTime(item.querySelector('pubDate')?.textContent),
        title: item.querySelector('title')?.textContent ?? undefined,
        url
      }
    })
  )
}

export const rss: Loader = {
  getMineLinksFromText(text) {
    let type = 'application/rss+xml'
    let headerLinks = findHeaderLinks(text, type)
    return [
      ...headerLinks,
      ...findDocumentLinks(text, type),
      ...findAnchorHrefs(text, /\.rss|\/rss/i, /rss/i)
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
    return parsePostSources(xml).find(i => {
      return (
        i.querySelector('guid')?.textContent === originId ||
        i.querySelector('link')?.textContent === originId
      )
    })?.outerHTML
  },

  getSuggestedLinksFromText(text) {
    return [new URL('/rss', new URL(text.url).origin).href]
  },

  isMineText(text) {
    let document = text.parseXml()
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
