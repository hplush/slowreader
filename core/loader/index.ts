import type { DownloadTask, TextResponse } from '../download.ts'
import type { PostsPage } from '../posts-page.ts'
import { atom } from './atom.ts'
import { jsonFeed } from './json-feed.ts'
import { rss } from './rss.ts'

export type Loader = {
  getMineLinksFromText(response: TextResponse): string[]
  getPosts(task: DownloadTask, url: string, text?: TextResponse): PostsPage
  getSuggestedLinksFromText(response: TextResponse): string[]
  isMineText(response: TextResponse): false | string
  isMineUrl(url: URL): false | string | undefined
}

export const loaders = {
  atom,
  jsonFeed,
  rss
}

export type LoaderName = keyof typeof loaders
