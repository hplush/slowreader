import type { DownloadTask, TextResponse } from '../download.ts'
import type { PostsList } from '../posts-list.ts'
import { atom } from './atom.ts'
import { jsonFeed } from './json-feed.ts'
import { rss } from './rss.ts'

export type Loader = {
  getMineLinksFromText(response: TextResponse): string[]
  getPosts(task: DownloadTask, url: string, text?: TextResponse): PostsList
  getSuggestedLinksFromText(response: TextResponse): string[]
  isMineText(response: TextResponse): false | string
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

export function getLoaderForText(response: TextResponse): false | FeedLoader {
  if (response.ok) {
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
  }
  return false
}
