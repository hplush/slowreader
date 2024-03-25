import type { TextResponse } from '../download.js'
import type { PreviewCandidate } from '../preview.js'

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

type UrlSegmentType = 'relative' | 'absolute' | 'explicit'

interface UrlSegment {
  path: string
  type: UrlSegmentType
}

function determineURLType(path: string): UrlSegmentType {
  if (path.startsWith('/')) {
    return 'absolute'
  } else if (path.startsWith('https://') || path.startsWith('http://')) {
    return 'explicit'
  }
  return 'relative'
}

function retrieveAllURLSegments(link: HTMLLinkElement): UrlSegment[] {
  let parent: Element | null = link.parentElement
  const urlSegments: UrlSegment[] = []

  while (parent) {
    const path = parent.getAttribute('xml:base')
    parent = parent.parentElement
    if (!path) {
      continue
    }

    const type = determineURLType(path)
    urlSegments.push({ path, type })
    if (type !== 'relative') {
      break
    }
  }
  return urlSegments
}

function buildBaseURLFromSegments(
  urlSegments: UrlSegment[],
  baseUrl: string
): string {
  while (urlSegments.length > 0) {
    const segment = urlSegments.pop()
    baseUrl = new URL(segment?.path!, baseUrl).href
  }
  return baseUrl
}

function buildFullURL(link: HTMLLinkElement, baseUrl: string): string {
  const urlSegments = retrieveAllURLSegments(link)
  baseUrl = buildBaseURLFromSegments(urlSegments, baseUrl)
  return new URL(link.getAttribute('href')!, baseUrl).href
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
