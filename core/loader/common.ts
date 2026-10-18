import type { FeedValue } from '../feed.ts'
import type { DownloadTask, TextResponse } from '../lib/download.ts'
import { isAbsoluteUrl, mapRelativeSrcset, parseDocument } from '../lib/html.ts'
import type { OriginPost, ParsedPost, PostMedia } from '../post.ts'
import type { PostsList, PostsListResult } from '../posts-list.ts'

export type Loader = {
  /**
   * Feed’s own icon. Without it, the icon is taken from the site.
   */
  getAvatarFromText(response: TextResponse): string | undefined

  /**
   * Find feeds URLs from HTML or HTTP headers.
   */
  getMineLinksFromText(response: TextResponse): string[]

  /**
   * Data to save in the feed and to pass to `getPosts()` on refresh.
   */
  getLoaderData?(task: DownloadTask, url: string): Promise<string | undefined>

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
    refreshedAt?: number,
    loaderData?: null | string
  ): PostsList

  /**
   * Load a single post to open it in the app without adding its feed.
   */
  getPostByUrl?(task: DownloadTask, url: string): Promise<OriginPost>

  /**
   * Get source data of post from loader's API for debug purposes.
   */
  getPostSource(feed: FeedValue, originId: string): Promise<unknown>

  /**
   * Profile URLs for the `@handle` from the Add page. Empty, if it is
   * a handle of another loader.
   */
  getProfilesByHandle?(task: DownloadTask, handle: string): Promise<string[]>

  /**
   * Earlier posts of the author’s thread from the oldest one, when refresh
   * has none of them. Empty if the thread starts with a reply to others.
   */
  getThreadAncestors?(
    task: DownloadTask,
    feedUrl: string,
    originId: string
  ): Promise<ParsedPost[]>

  /**
   * Try to suggest feed for given URL/document.
   *
   * For instance, by parsing <meta> or guessing URLs like `/rss` for RSS.
   */
  getSuggestedLinksFromText(response: TextResponse): string[]

  /**
   * Other feeds with the same posts, but less data, like RSS of social profile.
   */
  getSupersededLinksFromText?(response: TextResponse): string[]

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

  /**
   * Can `getPostByUrl()` load this URL.
   */
  isPostUrl?(url: URL): boolean
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
 * WordPress and Medium put the real image to `data-*` and a placeholder
 * to `src`.
 */
function restoreLazyImage(image: Element): boolean {
  let restored = false
  for (let [lazy, attr] of [
    ['data-original', 'src'],
    ['data-lazy-src', 'src'],
    ['data-src', 'src'],
    ['data-lazy-srcset', 'srcset'],
    ['data-srcset', 'srcset']
  ] as const) {
    let value = image.getAttribute(lazy)
    if (value === null) continue
    if (value) image.setAttribute(attr, value)
    image.removeAttribute(lazy)
    restored = true
  }
  return restored
}

/**
 * Feed has no `<base>` of the site page, so relative URL could be relative
 * to the post or to the site root. Sites use the same layout for all posts,
 * so one HTTP check of an image is enough for the whole feed.
 */
export function createUrlsResolver(
  task: DownloadTask
): (
  html: string | undefined,
  xmlBase: string | undefined,
  url: string
) => Promise<string | undefined> {
  let rootBased: Promise<boolean> | undefined
  return async (html, xmlBase, url) => {
    if (!html) return html
    let document = parseDocument(html)
    let changed = false
    // Trusted Types block setting script URL from other origin even here
    for (let script of document.querySelectorAll('script')) {
      script.remove()
      changed = true
    }
    let images: string[] = []
    for (let image of document.querySelectorAll('img, picture source')) {
      if (restoreLazyImage(image)) changed = true
      let src = image.getAttribute('src')
      if (src && !isAbsoluteUrl(src)) images.push(src)
      let srcset = image.getAttribute('srcset')
      if (srcset) {
        mapRelativeSrcset(srcset, link => {
          images.push(link)
          return link
        })
      }
    }

    let base = xmlBase
    if (!base) {
      let root = new URL('/', url).href
      let relative = images.find(
        link => new URL(link, url).href !== new URL(link, root).href
      )
      if (relative) {
        rootBased ??= isBroken(task, new URL(relative, url).href)
        if (await rootBased) base = root
      }
    }
    let resolve = (link: string): string => new URL(link, base ?? url).href
    let ids = new Set(
      Array.from(document.querySelectorAll('[id]'), element => element.id)
    )
    for (let element of document.querySelectorAll('[href], [src]')) {
      for (let attr of ['href', 'src']) {
        let value = element.getAttribute(attr)
        if (value === null || isAbsoluteUrl(value)) continue
        if (
          attr === 'href' &&
          value.startsWith('#') &&
          ids.has(value.slice(1))
        ) {
          continue
        }
        element.setAttribute(attr, resolve(value))
        changed = true
      }
    }
    for (let element of document.querySelectorAll('[srcset]')) {
      let srcset = element.getAttribute('srcset')!
      let resolved = mapRelativeSrcset(srcset, resolve)
      if (resolved !== srcset) {
        element.setAttribute('srcset', resolved)
        changed = true
      }
    }
    return changed ? document.body.innerHTML : html
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
 * Unlike `querySelector()`, ignores tags from other namespaces,
 * like `media:description` for RSS `description`.
 */
export function findOwnChild(parent: Element, name: string): Element | null {
  return (
    [...parent.children].find(i => {
      return i.localName === name && i.namespaceURI === parent.namespaceURI
    }) ?? null
  )
}

/**
 * Feeds often repeat the publish time in the update time. Negative time
 * is ignored, since -1 means an edit at unknown time.
 */
export function getUpdatedAt(
  publishedAt: number | undefined,
  updatedAt: number | undefined
): number | undefined {
  if (publishedAt && updatedAt && updatedAt > publishedAt && updatedAt > 0) {
    return updatedAt
  } else {
    return undefined
  }
}

/**
 * Find all images in HTML.
 */
export function findMediaInText(html: string | undefined): PostMedia[] {
  if (!html) return []
  let images = parseDocument(html).querySelectorAll('img[src]')
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

/**
 * Feeds and sites put relative and broken URLs to their icons.
 */
export function toAvatarUrl(
  link: null | string | undefined,
  base: string
): string | undefined {
  let trimmed = link?.trim()
  if (!trimmed || !URL.canParse(trimmed, base)) return undefined
  return new URL(trimmed, base).href
}

const APPLE_ICONS = ['apple-touch-icon', 'apple-touch-icon-precomposed']

/**
 * 52×52 icon of the feed popup on 2x screen.
 */
export const MIN_ICON_SIZE = 104

/**
 * `Infinity` for vector icons and 0 for unknown size. Apple’s icons
 * without `sizes` are 180×180 by Apple’s guidelines.
 */
function getIconSize(link: Element, rels: string[]): number {
  let sizes = link.getAttribute('sizes')?.toLowerCase().split(/\s+/) ?? []
  if (
    sizes.includes('any') ||
    link.getAttribute('type') === 'image/svg+xml' ||
    /\.svg($|\?)/i.test(link.getAttribute('href')!)
  ) {
    return Infinity
  }
  let largest = Math.max(0, ...sizes.map(size => parseInt(size) || 0))
  if (largest === 0 && rels.some(rel => APPLE_ICONS.includes(rel))) return 180
  return largest
}

/**
 * SVG is the best for any screen. Then the smallest sharp one
 * to not load 512×512 image.
 */
function sortIcons(icons: [Element, number][]): Element[] {
  let vector = icons.filter(([, size]) => size === Infinity)
  let sized = icons
    .filter(([, size]) => size > 0 && size !== Infinity)
    .toSorted((a, b) => a[1] - b[1])
  let sharp = sized.filter(([, size]) => size >= MIN_ICON_SIZE)
  let blurry = sized.filter(([, size]) => size < MIN_ICON_SIZE).toReversed()
  let unknown = icons.filter(([, size]) => size === 0)
  return [...vector, ...sharp, ...blurry, ...unknown].map(([link]) => link)
}

/**
 * Sites keep links to deleted icons in HTML.
 */
export async function isLoadableIcon(
  task: DownloadTask,
  url: string
): Promise<boolean> {
  try {
    let response = await task.request(url)
    await response.body?.cancel()
    // Single-page apps answer with HTML on any path
    return !response.headers.get('content-type')?.startsWith('text/')
  } catch {
    return false
  }
}

/**
 * Icon from the site’s HTML. Without it, `/favicon.ico`, which browsers
 * look for by default.
 */
export async function findSiteIcon(
  task: DownloadTask,
  url: string
): Promise<string | undefined> {
  let root = new URL('/', url).href
  let candidates: string[] = []
  try {
    let response = await task.text(root)
    let document = response.tryParseHTML()
    if (document) {
      let icons: [Element, number][] = []
      for (let link of document.querySelectorAll('link[href]')) {
        let rels = link.getAttribute('rel')?.toLowerCase().split(/\s+/) ?? []
        if (
          rels.includes('icon') ||
          rels.some(rel => APPLE_ICONS.includes(rel))
        ) {
          icons.push([link, getIconSize(link, rels)])
        }
      }
      for (let link of sortIcons(icons)) {
        let icon = toAvatarUrl(link.getAttribute('href'), response.url)
        if (icon) candidates.push(icon)
      }
    }
  } catch {}
  candidates.push(new URL('/favicon.ico', root).href)
  for (let icon of new Set(candidates)) {
    if (await isLoadableIcon(task, icon)) return icon
  }
  return undefined
}
