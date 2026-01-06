import type { FeedValue } from '../feed.ts'
import type { DownloadTask, TextResponse } from '../lib/download.ts'
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

/**
 * Returns full URL for link HTML element, which includes not only
 * the explicitly provided base URL, but also the base URL specified
 * in the document.
 */
export function buildFullURL(
  link: HTMLAnchorElement | HTMLLinkElement,
  baseUrl: string
): string {
  let href = link.getAttribute('href')!
  let urlSegments: string[] = [href]
  let parent: Element | null = link.parentElement
  while (parent) {
    let path = parent.getAttribute('xml:base') || ''
    urlSegments.push(path)
    parent = parent.parentElement

    if (path.startsWith('/') || path.startsWith('http')) {
      break
    }
  }
  return urlSegments.reduceRight(
    (base, url) => new URL(url, base).href,
    baseUrl
  )
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
  let parsed: Document | Element
  if (typeof text === 'string') {
    parsed = new DOMParser().parseFromString(text, 'text/html')
  } else {
    parsed = text
  }
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
 * Fetches feed data if modified, handling conditional requests.
 */
export async function fetchIfModified(
  task: DownloadTask,
  url: string,
  refreshedAt: number | undefined,
  parseCb: (response: TextResponse) => PostsListResult
): Promise<PostsListResult> {
  let headers = refreshedAt
    ? { 'If-Modified-Since': new Date(refreshedAt * 1000).toUTCString() }
    : undefined
  let response = await task.text(url, { headers })
  if (response.status === 304) return [[], undefined]
  return parseCb(response)
}
