import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { type OriginPost, type PostMedia, stringifyMedia } from '../post.ts'
import { createPostsList, type PostsListResult } from '../posts-list.ts'
import {
  buildFullURL,
  findAnchorHrefs,
  findDocumentLinks,
  findHeaderLinks,
  findMediaInText,
  type Loader,
  toTime
} from './common.ts'

export function findMRSS(element: Element): PostMedia[] {
  let result: PostMedia[] = []
  let mrss = element.getElementsByTagNameNS(
    'http://search.yahoo.com/mrss/',
    'content'
  )
  for (let content of mrss) {
    let type = content.getAttribute('type') ?? content.getAttribute('medium')
    let url = content.getAttribute('url')
    if (!url) {
      let thumbnail = content.querySelector('thumbnail')
      if (thumbnail) url = thumbnail.getAttribute('url')
    }
    if (url && type) {
      result.push({ type, url })
    }
  }
  return result
}

function removeNS(node: Element | undefined): string {
  let html = ''
  if (!node) return html

  node.childNodes.forEach(i => {
    let child = i as Element
    if (child.nodeType === 3 /* Node.TEXT_NODE */) {
      html += child.textContent
    } else if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
      let tagName = child.localName
      let attributes = Array.from(child.attributes)
        .map(attr => ` ${attr.localName}="${attr.value}"`)
        .join('')

      html += `<${tagName}${attributes}>${removeNS(child)}</${tagName}>`
    }
  })
  return html
}

function extractHtml(node: Element | null): string | undefined {
  if (!node) return undefined
  if (node.getAttribute('type') === 'xhtml') {
    return removeNS(node.children[0])
  } else {
    return node.textContent
  }
}

function parsePostSources(text: TextResponse): Element[] {
  let document = text.parseXml()
  return [...document.querySelectorAll('entry')].filter(
    entry => entry.querySelector('id')?.textContent
  )
}

function parsePosts(text: TextResponse): OriginPost[] {
  return parsePostSources(text).map(entry => {
    let content = entry.querySelector('content')

    let textMedia = findMediaInText(content)
    let postMedia: PostMedia[] = []
    let enclosures = entry.querySelectorAll('link[rel=enclosure]')
    for (let enclosure of enclosures) {
      let url = enclosure.getAttribute('href')
      let type = enclosure.getAttribute('type')
      if (url && type) {
        postMedia.push({ type, url })
      }
    }
    postMedia = postMedia.concat(findMRSS(entry))

    return {
      full: extractHtml(content),
      intro: extractHtml(entry.querySelector('summary')),
      media: stringifyMedia([...postMedia, ...textMedia]),
      originId: entry.querySelector('id')!.textContent,
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

function parseFeed(
  task: DownloadTask,
  response: TextResponse
): PostsListResult {
  let posts = parsePosts(response)
  let document = response.parseXml()
  let nextPage = document.querySelector<HTMLLinkElement>('link[rel=next]')
  if (nextPage) {
    let nextUrl = buildFullURL(nextPage, response.url)
    return [posts, () => loadFeed(task, nextUrl)]
  } else {
    return [posts, undefined]
  }
}

async function loadFeed(
  task: DownloadTask,
  url: string
): Promise<PostsListResult> {
  return parseFeed(task, await task.text(url))
}

export const atom: Loader = {
  getMineLinksFromText(text) {
    let type = 'application/atom+xml'
    let headerLinks = findHeaderLinks(text, type)
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
      return createPostsList(() => parseFeed(task, text))
    } else {
      return createPostsList(() => loadFeed(task, url))
    }
  },

  async getPostSource(feed, originId) {
    let xml = await createDownloadTask().text(feed.url)
    return parsePostSources(xml).find(i => {
      return i.querySelector('id')?.textContent === originId
    })?.outerHTML
  },

  getSuggestedLinksFromText(text) {
    let { origin } = new URL(text.url)
    return [new URL('/feed', origin).href, new URL('/atom', origin).href]
  },

  isMineText(text) {
    let document = text.parseXml()
    if (document.firstElementChild?.nodeName === 'feed') {
      return document.querySelector(':root > title')?.textContent ?? ''
    } else {
      return false
    }
  },

  isMineUrl() {
    return undefined
  }
}
