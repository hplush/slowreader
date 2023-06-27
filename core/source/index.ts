import type { DownloadTask, TextResponse } from '../download/index.js'
import type { Post } from '../post/index.js'
import { rss } from './rss.js'

export type Source = {
  getMineLinksFromText(response: TextResponse): string[]
  getPosts(
    task: DownloadTask,
    url: string,
    text?: TextResponse
  ): Promise<Post[]>
  isMineText(response: TextResponse): false | string
  isMineUrl(url: URL): false | string | undefined
}

export const sources = {
  rss
}

export type SourceName = keyof typeof sources
