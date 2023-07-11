import type { TextResponse } from '../index.js'

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
