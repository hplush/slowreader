import type { TextResponse } from '../download.js'
import type { PreviewCandidate } from '../preview.js'

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

function retrieveAllURLSegments(link: HTMLLinkElement): string[] {
  let href = link.getAttribute('href')!
  let urlSegments: string[] = [href]
  let parent: Element | null = link.parentElement
  while (parent) {
    let path = parent.getAttribute('xml:base') || ''
    parent = parent.parentElement
    urlSegments.push(path)

    if (path.startsWith('/') || path.startsWith('http')) {
      break
    }
  }
  return urlSegments
}

function buildFullURL(link: HTMLLinkElement, baseUrl: string): string {
  let urlSegments = retrieveAllURLSegments(link)
  return urlSegments.reduceRight(
    (base, href) => new URL(href, base).href,
    baseUrl
  )
}

export function findLink(text: TextResponse, type: string): string[] {
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
    findLink(text, 'application/atom+xml').length > 0 ||
    findLink(text, 'application/rss+xml').length > 0 ||
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
