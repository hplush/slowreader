import type { DownloadTask, TextResponse } from '../download.js'
import type { OriginPost } from '../post.js'
import type { PreviewCandidate } from '../preview.js'
import { atom } from './atom.js'
import { rss } from './rss.js'

export type Loader = {
  getMineLinksFromText(
    response: TextResponse,
    found: PreviewCandidate[]
  ): string[]
  getPosts(
    task: DownloadTask,
    url: string,
    text?: TextResponse
  ): Promise<OriginPost[]>
  isMineText(response: TextResponse): false | string
  isMineUrl(url: URL): false | string | undefined
}

export const loaders = {
  atom,
  rss
}

export type LoaderName = keyof typeof loaders
