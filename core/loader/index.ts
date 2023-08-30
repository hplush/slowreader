import type { DownloadTask, TextResponse } from '../download/index.js'
import type { PostValue } from '../post/index.js'
import type { PreviewCandidate } from '../preview/index.js'
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
  ): Promise<PostValue[]>
  isMineText(response: TextResponse): false | string
  isMineUrl(url: URL): false | string | undefined
}

export const loaders = {
  atom,
  rss
}

export type LoaderName = keyof typeof loaders
