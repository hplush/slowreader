import type { DownloadTask, TextResponse } from '../download.js'
import type { PostsPage } from '../posts-page.js'
import type { PreviewCandidate } from '../preview.js'
import { atom } from './atom.js'
import { rss } from './rss.js'

export type Loader = {
  getMineLinksFromText(
    response: TextResponse,
    found: PreviewCandidate[]
  ): string[]
  getPosts(task: DownloadTask, url: string, text?: TextResponse): PostsPage
  isMineText(response: TextResponse): false | string
  isMineUrl(url: URL): false | string | undefined
}

export const loaders = {
  atom,
  rss
}

export type LoaderName = keyof typeof loaders
