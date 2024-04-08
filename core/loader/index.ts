import type { DownloadTask, TextResponse } from '../download.js'
import type { PostsPage } from '../posts-page.js'
import { atom } from './atom.js'
import { json } from './json.js'
import { rss } from './rss.js'

export type Loader = {
  getMineLinksFromText(response: TextResponse): string[]
  getPosts(task: DownloadTask, url: string, text?: TextResponse): PostsPage
  getSuggestedLinksFromText(response: TextResponse): string[]
  isMineText(response: TextResponse): false | string
  isMineUrl(url: URL): false | string | undefined
}

export const loaders = {
  atom,
  json,
  rss
}

export type LoaderName = keyof typeof loaders
