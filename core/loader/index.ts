import type { DownloadTask, TextResponse } from '../download.ts'
import type { PostsList } from '../posts-list.ts'
import { atom } from './atom.ts'
import { jsonFeed } from './json-feed.ts'
import { rss } from './rss.ts'

export type Loader = {
  /**
   * Returns all urls found in the html document itself and in its http headers.
   * Response here is the website response with a html document.
   */
  getMineLinksFromText(response: TextResponse): string[]
  /**
   * Extracts the feed's posts, given feed download task or the response with
   * the feed's xml.
   */
  getPosts(task: DownloadTask, url: string, text?: TextResponse): PostsList
  /**
   * Given the website html response, returns the default feed url,
   * e.g. https://example.com/rss for rss feed.
   */
  getSuggestedLinksFromText(response: TextResponse): string[]
  /**
   * Returns feed title, if any
   */
  isMineText(response: TextResponse): false | string
  /**
   * For instance, YouTube loader will return true for youtube.com links or Telegram loader for t.me links.
   * It detects that URL is 100% for this loader.
   * It is not used right now because there is no way to detect RSS/Atom link just by URL.
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
          title: title.trim(),
          url: response.url
        }
      }
    }
  }
  return false
}
