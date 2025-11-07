import type { DownloadTask, TextResponse } from '../lib/download.ts'
import type { PostsList } from '../posts-list.ts'
import { atom } from './atom.ts'
import { jsonFeed } from './json-feed.ts'
import { rss } from './rss.ts'

export type Loader = {
  /**
   * Find feeds URLs from HTML or HTTP headers.
   */
  getMineLinksFromText(response: TextResponse): string[]

  /**
   * Extracts the feed's posts.
   *
   * If the URL’s document was already downloaded during the feed’s search.
   *
   * Task is a way to combine multiple HTTP requests (for instance, during
   * the feed search/preview) to cancel all of them fast.
   */
  getPosts(task: DownloadTask, url: string, text?: TextResponse): PostsList

  /**
   * Try to suggest feed for given URL/document.
   *
   * For instance, by parsing <meta> or guessing URLs like `/rss` for RSS.
   */
  getSuggestedLinksFromText(response: TextResponse): string[]

  /**
   * Detects that document is a loader’s feed.
   *
   * Return feed’s title if true.
   */
  isMineText(response: TextResponse): false | string

  /**
   * It detects that URL is 100% for this loader.
   *
   * For instance, YouTube loader will return true for youtube.com links.
   *
   * It is not used right now because there is no way to detect RSS/Atom link
   * just by URL.
   */
  isMineUrl(url: URL): false | string | undefined
}

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
