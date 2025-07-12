import type { TextResponse } from '../download.ts'

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

/** Detects that the server responded with a HTML document */
export function isHTML(text: TextResponse): boolean {
  return text.text.toLocaleLowerCase().includes('<html')
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
  let document = text.parseXml()
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
  let document = text.parseXml()
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

export function findImageByAttr(
  attr: 'src' | 'url',
  elements?: Iterable<Element> | null
): string[] {
  return [...(elements || [])].reduce<string[]>((urls, element) => {
    let url = element.getAttribute(attr)
    return url ? urls.concat(url) : urls
  }, [])
}

/**
 * Returns the unique elements without `null` from array.
 */
export function unique<T extends number | string = string>(
  collection: Iterable<null | T | undefined>
): T[] {
  return [...new Set([...collection].filter(str => str != null))] as T[]
}
