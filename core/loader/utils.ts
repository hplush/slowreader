import type { TextResponse } from '../download.js'
import type { PreviewCandidate } from '../preview.js'

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

export function findLink(text: TextResponse, type: string): string[] {
  return [...text.parse().querySelectorAll('link')]
    .filter(
      link =>
        link.getAttribute('type') === type &&
        isString(link.getAttribute('href'))
    )
    .map(i => new URL(i.getAttribute('href')!, text.url).href)
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
