import type { FeedValue } from '../feed.ts'
import type { DownloadTask, TextResponse } from '../lib/download.ts'
import { isAbsoluteUrl, mapRelativeSrcset, parseDocument } from '../lib/html.ts'
import type { PostMedia } from '../post.ts'
import type { PostsList, PostsListResult } from '../posts-list.ts'

export type Loader = {
  /**
   * Find feeds URLs from HTML or HTTP headers.
   */
  getMineLinksFromText(response: TextResponse): string[]

  /**
   * Extracts the feed's posts.
   *
   * If the URL’s document was already downloaded during the feed’s search.
   *
   * Task is a way to combine multiple HTTP requests (for instance, during
   * the feed search/preview) to cancel all of them fast.
   */
  getPosts(
    task: DownloadTask,
    url: string,
    text?: TextResponse,
    refreshedAt?: number
  ): PostsList

  /**
   * Get source data of post from loader's API for debug purposes.
   */
  getPostSource(feed: FeedValue, originId: string): Promise<unknown>

  /**
   * Try to suggest feed for given URL/document.
   *
   * For instance, by parsing <meta> or guessing URLs like `/rss` for RSS.
   */
  getSuggestedLinksFromText(response: TextResponse): string[]

  /**
   * Detects that document is a loader’s feed.
   *
   * Return feed’s title if true.
   */
  isMineText(response: TextResponse): false | string

  /**
   * It detects that URL is 100% for this loader.
   *
   * For instance, YouTube loader will return true for youtube.com links.
   *
   * It is not used right now because there is no way to detect RSS/Atom link
   * just by URL.
   */
  isMineUrl(url: URL): false | string | undefined
}

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

export function findXmlBase(
  element: Element | null,
  url: string
): string | undefined {
  let bases: string[] = []
  while (element) {
    let base = element.getAttribute('xml:base')
    if (base) {
      bases.push(base)
      if (base.startsWith('/') || base.startsWith('http')) break
    }
    element = element.parentElement
  }
  if (bases.length === 0) return undefined
  return bases.reduceRight((parent, base) => new URL(base, parent).href, url)
}

/**
 * Returns full URL for link HTML element, which includes not only
 * the explicitly provided base URL, but also the base URL specified
 * in the document.
 */
export function buildFullURL(
  link: HTMLAnchorElement | HTMLLinkElement,
  baseUrl: string
): string {
  return new URL(
    link.getAttribute('href')!,
    findXmlBase(link.parentElement, baseUrl) ?? baseUrl
  ).href
}

async function isBroken(task: DownloadTask, url: string): Promise<boolean> {
  try {
    let response = await task.request(url)
    await response.body?.cancel()
    return false
  } catch {
    return true
  }
}

/**
 * Feed has no `<base>` of the site page, so relative image could be relative
 * to the post or to the site root. Sites use the same layout for all posts,
 * so one HTTP check is enough for the whole feed.
 */
export function createImagesResolver(
  task: DownloadTask
): (
  html: string | undefined,
  xmlBase: string | undefined,
  url: string
) => Promise<string | undefined> {
  let rootBased: Promise<boolean> | undefined
  return async (html, xmlBase, url) => {
    if (!html || !/<img/i.test(html)) return html
    let document = parseDocument(html)
    let links: string[] = []
    for (let image of document.querySelectorAll('img, picture source')) {
      let src = image.getAttribute('src')
      if (src && !isAbsoluteUrl(src)) links.push(src)
      let srcset = image.getAttribute('srcset')
      if (srcset) {
        mapRelativeSrcset(srcset, link => {
          links.push(link)
          return link
        })
      }
    }
    if (links.length === 0) return html

    let base = xmlBase
    if (!base) {
      let root = new URL('/', url).href
      let relative = links.find(
        link => new URL(link, url).href !== new URL(link, root).href
      )
      if (relative) {
        rootBased ??= isBroken(task, new URL(relative, url).href)
        if (await rootBased) base = root
      }
    }
    let resolve = (link: string): string => new URL(link, base ?? url).href
    for (let image of document.querySelectorAll('img, picture source')) {
      let src = image.getAttribute('src')
      if (src && !isAbsoluteUrl(src)) image.setAttribute('src', resolve(src))
      let srcset = image.getAttribute('srcset')
      if (srcset) {
        image.setAttribute('srcset', mapRelativeSrcset(srcset, resolve))
      }
    }
    return document.body.innerHTML
  }
}

/**
 * Returns full URLs found in the document’s `<link>` elements.
 */
export function findDocumentLinks(text: TextResponse, type: string): string[] {
  let document = text.tryParseHTML()
  if (!document) return []
  return [...document.querySelectorAll('link')]
    .filter(
      link =>
        link.getAttribute('type') === type &&
        isString(link.getAttribute('href'))
    )
    .map(link => buildFullURL(link, text.url))
}

/**
 * Returns full URLs found in the document’s `<a>` elements.
 */
export function findAnchorHrefs(
  text: TextResponse,
  hrefPattern: RegExp,
  textPattern?: RegExp
): string[] {
  let document = text.tryParseHTML()
  if (!document) return []
  return [...document.querySelectorAll('a')]
    .filter(a => {
      let href = a.getAttribute('href')
      if (!href) return false
      if (textPattern && a.textContent && textPattern.test(a.textContent)) {
        return true
      }
      return hrefPattern.test(href)
    })
    .map(a => buildFullURL(a, text.url))
}

/**
 * Returns an array of full URL found in the `Link` HTTP header like:
 *
 * ```
 * <http://blog.com/?feed=rss2>; rel="alternate"; type="application/rss+xml"
 * ```
 *
 * URLs in this header can also be multiple, comma-separated.
 * And possibly relative (the method will convert them to absolute).
 */
export function findHeaderLinks(
  response: TextResponse,
  type: string
): string[] {
  let linkHeader = response.headers.get('Link')
  if (!linkHeader) {
    return []
  }
  return linkHeader.split(/,\s?/).reduce<string[]>((urls, link) => {
    let [, url] = link.match(/<(.*)>/) || []
    let attributes = link.split(/;\s?/)
    let matchesType = attributes.includes(`type="${type}"`)
    let isAlternate = attributes.includes('rel="alternate"')
    if (url && matchesType && isAlternate) {
      let fullUrl = /^https?/.test(url) ? url : new URL(url, response.url).href
      urls.push(fullUrl)
    }
    return urls
  }, [])
}

/**
 * Returns the UNIX timestamp of a date.
 */
export function toTime(date: null | string | undefined): number | undefined {
  if (!date) return undefined
  let time = new Date(date).getTime() / 1000
  if (isNaN(time)) {
    return undefined
  } else {
    return time
  }
}

/**
 * Find all images in HTML node.
 */
export function findMediaInText(
  text: Element | null | string | undefined
): PostMedia[] {
  if (!text) return []
  let parsed = typeof text === 'string' ? parseDocument(text) : text
  let images = parsed.querySelectorAll('img[src]')
  return [...images].map(img => {
    return {
      fromText: true,
      type: 'image',
      url: img.getAttribute('src')!
    } satisfies PostMedia
  })
}

/**
 * Prevent heavy loading/parsing by `If-Modified-Since` header.
 */
export async function fetchIfModified(
  task: DownloadTask,
  url: string,
  refreshedAt: number | undefined,
  parseCb: (
    response: TextResponse
  ) => Promise<PostsListResult> | PostsListResult
): Promise<PostsListResult> {
  let headers = refreshedAt
    ? { 'If-Modified-Since': new Date(refreshedAt * 1000).toUTCString() }
    : undefined
  let response = await task.text(url, { headers })
  if (response.status === 304) return [[], undefined]
  return parseCb(response)
}
