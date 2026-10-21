import { getEnvironment } from '../environment.ts'
import { isRemoteError } from '../errors.ts'
import type { DownloadTask, TextResponse } from '../lib/download.ts'
import type { AccountValue } from '../schema.ts'
import { atom } from './atom.ts'
import { bluesky } from './bluesky.ts'
import type { DetectedFeed, FeedData, Loader } from './common.ts'
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

/**
 * Network and service errors are ignored, since the saved feed’s title
 * and avatar are still good.
 */
export async function tryLoadFeedData(
  task: DownloadTask,
  loader: LoaderName,
  url: string,
  opts?: { account?: AccountValue; response?: TextResponse }
): Promise<FeedData | undefined> {
  try {
    return await loaders[loader].loadFeedData(task, url, opts)
  } catch (e) {
    if (!isRemoteError(e)) getEnvironment().warn(e)
    return undefined
  }
}
