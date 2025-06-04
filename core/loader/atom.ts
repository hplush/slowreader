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
  toTime
} from './utils.ts'

function parsePosts(text: TextResponse): OriginPost[] {
  let document = text.parseXml()
  if (!document) return []
  return [...document.querySelectorAll('entry')]
    .filter(entry => entry.querySelector('id')?.textContent)
    .map(entry => {
      let content = entry.querySelector('content')
      return {
        full: content?.textContent ?? undefined,
        intro: entry.querySelector('summary')?.textContent ?? undefined,
        media: findImageByAttr('src', content?.querySelectorAll('img')),
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
      }
    })
}

export const atom: Loader = {
  getMineLinksFromText(text) {
    let type = 'application/atom+xml'
    let headerLinks = findHeaderLinks(text, type)
    if (!isHTML(text)) return headerLinks
    let links = [
      ...headerLinks,
      ...findDocumentLinks(text, type),
      ...findAnchorHrefs(text, /feeds\.|feed\.|\.atom|\/atom/i, /feed|atom/i)
    ]
    if (links.length > 0) {
      return links
    } else {
      return [...findAnchorHrefs(text, /\.xml/i)]
    }
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
    let { origin } = new URL(text.url)
    return [new URL('/feed', origin).href, new URL('/atom', origin).href]
  },

  isMineText(text) {
    let document = text.parseXml()
    if (document?.firstElementChild?.nodeName === 'feed') {
      return document.querySelector(':root > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
