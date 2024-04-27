import type { TextResponse } from '../download.js'
import type { OriginPost } from '../post.js'
import { createPostsPage } from '../posts-page.js'
import type { Loader } from './index.js'
import {
  findAnchorHrefs,
  findImageByAttr,
  findLinksByType,
  toTime,
  unique
} from './utils.js'

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
    return [
      ...findLinksByType(text, 'application/rss+xml'),
      ...findAnchorHrefs(text, /\.rss|\/rss/i)
    ]
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
