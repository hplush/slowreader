import type { TextResponse } from '../lib/download.ts'
import { atom } from './atom.ts'
import type { Loader } from './common.ts'
import { jsonFeed } from './json-feed.ts'
import { rss } from './rss.ts'

export type { Loader }

export const loaders = {
  atom,
  jsonFeed,
  rss
} satisfies {
  [Name in string]: Loader
}

export type LoaderName = keyof typeof loaders

export interface FeedLoader {
  loader: Loader
  name: LoaderName
  title: string
  url: string
}

/**
 * Decides which loader to use for the given feed response.
 */
export function getLoaderForText(response: TextResponse): false | FeedLoader {
  let names = Object.keys(loaders) as LoaderName[]
  let parsed = new URL(response.url)
  for (let name of names) {
    if (loaders[name].isMineUrl(parsed) !== false) {
      let title = loaders[name].isMineText(response)
      if (title !== false) {
        return {
          loader: loaders[name],
          name,
          title: title.trim() || parsed.hostname,
          url: response.url
        }
      }
    }
  }
  return false
}
