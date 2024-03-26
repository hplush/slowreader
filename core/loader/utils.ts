import type { TextResponse } from '../download.js'
import type { PreviewCandidate } from '../preview.js'

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

function buildFullURL(link: HTMLLinkElement, baseUrl: string): string {
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
  return [...text.parse().querySelectorAll('link')]
    .filter(
      link =>
        link.getAttribute('type') === type &&
        isString(link.getAttribute('href'))
    )
    .map(link => buildFullURL(link, text.url))
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
