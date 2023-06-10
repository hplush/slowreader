import type { PreviewUrl } from '../preview/url/index.js'
import { rss } from './rss.js'
import { twitter } from './twitter.js'

export interface Source {
  isMineUrl(url: PreviewUrl): boolean | undefined
}

export const sources = {
  rss,
  twitter
}

export type SourceName = keyof typeof sources

export function getSourcesFromUrl(url: PreviewUrl): SourceName[] {
  let names = Object.keys(sources) as SourceName[]
  let possible: SourceName[] = []
  for (let name of names) {
    let source = sources[name]
    let status = source.isMineUrl(url)
    if (status === true) {
      return [name]
    } else if (status !== false) {
      possible.push(name)
    }
  }
  return possible
}
