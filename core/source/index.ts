import type { TextResponse } from '../download/index.js'
import { rss } from './rss.js'

export type Source = {
  getMineLinksFromText(response: TextResponse): string[]
  isMineText(response: TextResponse): false | string
  isMineUrl(url: URL): false | string | undefined
}

export const sources = {
  rss
}

export type SourceName = keyof typeof sources
