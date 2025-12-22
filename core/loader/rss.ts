import { createDownloadTask, type TextResponse } from '../lib/download.ts'
import { type OriginPost, type PostMedia, stringifyMedia } from '../post.ts'
import { createPostsList } from '../posts-list.ts'
import { findMRSS } from './atom.ts'
import {
  findAnchorHrefs,
  findDocumentLinks,
  findHeaderLinks,
  findMediaInText,
  isHTML,
  type Loader,
  toTime
} from './common.ts'

function parsePostSources(text: TextResponse): Element[] {
  let document = text.parseXml()
  if (!document) return []
  return [...document.querySelectorAll('item')].filter(
    item =>
      item.querySelector('guid')?.textContent ??
      item.querySelector('link')?.textContent
  )
}

function parsePosts(text: TextResponse): OriginPost[] {
  return parsePostSources(text).map(item => {
    let description = item.querySelector('description')

    let textMedia = findMediaInText(description?.textContent)
    let postMedia: PostMedia[] = []
    let enclosures = item.querySelectorAll('enclosure')
    for (let enclosure of enclosures) {
      let url = enclosure.getAttribute('url')
      let type = enclosure.getAttribute('type')
      if (url && type) {
        postMedia.push({ type, url })
      }
    }
    postMedia = postMedia.concat(findMRSS(item))

    return {
      full: description?.textContent ?? undefined,
      media: stringifyMedia([...postMedia, ...textMedia]),
      originId:
        item.querySelector('guid')?.textContent ??
        item.querySelector('link')!.textContent,
      publishedAt: toTime(item.querySelector('pubDate')?.textContent),
      title: item.querySelector('title')?.textContent ?? undefined,
      url: item.querySelector('link')?.textContent ?? undefined
    }
  })
}

export const rss: Loader = {
  getMineLinksFromText(text) {
    let type = 'application/rss+xml'
    let headerLinks = findHeaderLinks(text, type)
    if (!isHTML(text)) return headerLinks
    return [
      ...headerLinks,
      ...findDocumentLinks(text, type),
      ...findAnchorHrefs(text, /\.rss|\/rss/i, /rss/i)
    ]
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
    try {
      let document = text.parseXml()
      if (document?.firstElementChild?.nodeName === 'rss') {
        return document.querySelector('channel > title')?.textContent ?? ''
      } else {
        return false
      }
    } catch {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
