import type { TextResponse } from '../download.js'
import type { PreviewCandidate } from '../preview.js'

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

function buildFullURL(
  link: HTMLLinkElement | HTMLAnchorElement,
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

export function findLinks(text: TextResponse, type: string): string[] {
  let links: string[] = []

  links.push(
    ...[...text.parse().querySelectorAll('link')]
      .filter(
        link =>
          link.getAttribute('type') === type &&
          isString(link.getAttribute('href'))
      )
      .map(link => buildFullURL(link, text.url))
  )

  links.push(
    ...[...text.parse().querySelectorAll('a')]
      .filter(a => {
        let href = a.getAttribute('href')
        if (!href) return false
        return (
          href.includes('feed.') ||
          href.includes('feed.xml') ||
          href.includes('.rss') ||
          href.includes('.atom') ||
          href.includes('/rss') ||
          href.includes('/atom')
        )
      })
      .map(a => buildFullURL(a, text.url))
  )

  return links
}

export function hasAnyFeed(
  text: TextResponse,
  found: PreviewCandidate[]
): boolean {
  return (
    findLinks(text, 'application/atom+xml').length > 0 ||
    findLinks(text, 'application/rss+xml').length > 0 ||
    // TODO: Replace when we will have more loaders
    // found.some(i => i.loader === 'rss' || i.loader === 'atom')
    found.length > 0
  )
}

export function toTime(date: null | string | undefined): number | undefined {
  if (!date) return undefined
  let time = new Date(date).getTime() / 1000
  if (isNaN(time)) {
    return undefined
  } else {
    return time
  }
}
