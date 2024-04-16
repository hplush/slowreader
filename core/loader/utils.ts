import type { TextResponse } from '../download.js'

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

function buildFullURL(
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

export function findLinksByType(text: TextResponse, type: string): string[] {
  return [...text.parse().querySelectorAll('link')]
    .filter(
      link =>
        link.getAttribute('type') === type &&
        isString(link.getAttribute('href'))
    )
    .map(link => buildFullURL(link, text.url))
}

export function findAnchorHrefs(
  text: TextResponse,
  hrefPattern: RegExp
): string[] {
  return [...text.parse().querySelectorAll('a')]
    .filter(a => {
      let href = a.getAttribute('href')
      if (!href) return false
      return hrefPattern.test(href)
    })
    .map(a => buildFullURL(a, text.url))
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

export function findImageByAttr(
  attr: 'src' | 'url',
  elements?: Iterable<Element> | null
): string[] {
  return [...(elements || [])].reduce<string[]>((urls, element) => {
    const url = element.getAttribute(attr)
    return url ? urls.concat(url) : urls
  }, [])
}

export function unique<T extends string | number = string>(
  collection: Iterable<T | null | undefined>
): T[] {
  return [...new Set([...collection].filter(str => str != null))] as T[]
}
