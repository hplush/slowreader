import type { DownloadTask, TextResponse } from '../lib/download.ts'
import { atom } from './atom.ts'
import { bluesky } from './bluesky.ts'
import type { Loader, DetectedFeed } from './common.ts'
import { jsonFeed } from './json-feed.ts'
import { mastodon } from './mastodon.ts'
import { rss } from './rss.ts'

export type { Loader, DetectedFeed }

export const loaders = {
  atom,
  bluesky,
  jsonFeed,
  mastodon,
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
export async function getLoaderForText(
  response: TextResponse,
  task: DownloadTask,
  url: string
): Promise<false | FeedLoader> {
  let names = Object.keys(loaders) as LoaderName[]
  for (let name of names) {
    if (loaders[name].isMineUrl(new URL(url)) !== false) {
      let detected: false | DetectedFeed
      try {
        detected = await loaders[name].detectFeed(response, task, url)
      } catch {
        detected = false
      }
      if (detected !== false) {
        return {
          loader: loaders[name],
          name,
          title: detected.title.trim() || new URL(response.url).hostname,
          url: detected.url ?? response.url
        }
      }
    }
  }
  return false
}
