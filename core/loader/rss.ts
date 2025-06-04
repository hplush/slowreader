import type { TextResponse } from '../download.ts'
import type { OriginPost } from '../post.ts'
import { createPostsList } from '../posts-list.ts'
import type { Loader } from './index.ts'
import {
  findAnchorHrefs,
  findDocumentLinks,
  findHeaderLinks,
  findImageByAttr,
  isHTML,
  toTime,
  unique
} from './utils.ts'

const MEDIA_NS_URI = 'http://search.yahoo.com/mrss/'

function parsePosts(text: TextResponse): OriginPost[] {
  let document = text.parseXml()
  if (!document) return []
  return [...document.querySelectorAll('item')]
    .filter(
      item =>
        item.querySelector('guid')?.textContent ??
        item.querySelector('link')?.textContent
    )
    .map(item => {
      let description = item.querySelector('description')

      let descriptionImageElements = description?.querySelectorAll('img')
      let descriptionImages = findImageByAttr('src', descriptionImageElements)

      let mediaImageElements = [
        ...item.getElementsByTagNameNS(MEDIA_NS_URI, 'content')
      ].filter(element => element.getAttribute('medium') === 'image')
      let mediaImages = findImageByAttr('url', mediaImageElements)

      return {
        full: description?.textContent ?? undefined,
        media: unique([...descriptionImages, ...mediaImages]),
        originId:
          item.querySelector('guid')?.textContent ??
          item.querySelector('link')!.textContent!,
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

  getSuggestedLinksFromText(text) {
    return [new URL('/rss', new URL(text.url).origin).href]
  },

  isMineText(text) {
    let document = text.parseXml()
    if (document?.firstElementChild?.nodeName === 'rss') {
      return document.querySelector('channel > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
