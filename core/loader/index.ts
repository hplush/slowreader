import { getEnvironment } from '../environment.ts'
import { isRemoteError } from '../errors.ts'
import type { DownloadTask, TextResponse } from '../lib/download.ts'
import { isSaveData } from '../lib/network.ts'
import type { AccountValue } from '../schema.ts'
import { atom } from './atom.ts'
import { bluesky } from './bluesky.ts'
import type {
  AccountAuth,
  DetectedFeed,
  FeedData,
  Loader,
  MovedFeed
} from './common.ts'
import { jsonFeed } from './json-feed.ts'
import { mastodon } from './mastodon.ts'
import { rss } from './rss.ts'
import { rss1 } from './rss1.ts'
import { telegram } from './telegram.ts'

export type { AccountAuth, DetectedFeed, Loader, MovedFeed }

export const loaders = {
  atom,
  bluesky,
  jsonFeed,
  mastodon,
  rss,
  rss1,
  telegram
} satisfies {
  [Name in string]: Loader
}

export type LoaderName = keyof typeof loaders

/**
 * Feeds with profile URLs belong to people from social networks,
 * which show avatars as circles.
 */
export function hasPersonAvatar(loader: string | undefined): boolean {
  let found: Loader | undefined = loaders[loader as LoaderName]
  return !!found?.isProfileUrl
}

/**
 * File of the media, which browser can not load by URL on its own.
 */
export function loadLoaderMedia(url: string): Promise<Response> | undefined {
  for (let loader of Object.values<Loader>(loaders)) {
    let media = loader.getMedia?.(url)
    if (media) return media
  }
  return undefined
}

/**
 * Map key of the feed, which does not change with feed’s URL.
 */
export function getOriginKey(
  loader: LoaderName,
  loaderData: null | string | undefined
): string | undefined {
  if (!loaderData) return undefined
  let found: Loader = loaders[loader]
  let id = found.getOriginId?.(loaderData)
  return id ? `${loader} ${id}` : undefined
}

export interface FeedLoader {
  loader: Loader
  name: LoaderName
  title: string
  url: string
}

function toFeedLoader(
  name: LoaderName,
  detected: DetectedFeed,
  url: string
): FeedLoader {
  return {
    loader: loaders[name],
    name,
    title: detected.title.trim() || new URL(url).hostname,
    url: detected.url ?? url
  }
}

export type UrlCheck =
  | { feed: Promise<false | FeedLoader>; name: LoaderName; sure: true }
  | { names: LoaderName[]; sure: false }

/**
 * Asks loaders about the URL without downloading it. A sure loader already
 * started the request to its API. Others need the page.
 */
export function checkUrl(task: DownloadTask, url: string): UrlCheck {
  let parsed = URL.parse(url)
  let names: LoaderName[] = []
  if (parsed) {
    for (let name of Object.keys(loaders) as LoaderName[]) {
      let answer = loaders[name].isMineUrl(task, parsed)
      if (answer) {
        let feed = answer.then(detected => {
          return detected ? toFeedLoader(name, detected, url) : false
        })
        // Caller can drop the check of a link, which it will not add
        feed.catch(() => {})
        return { feed, name, sure: true }
      } else if (answer !== false) {
        names.push(name)
      }
    }
  }
  return { names, sure: false }
}

/**
 * Finds the feed by the URL. It downloads the URL as a page only
 * if no loader is sure by the URL alone.
 */
export async function findFeed(
  task: DownloadTask,
  url: string,
  check = checkUrl(task, url)
): Promise<{ feed: false | FeedLoader; response: TextResponse | undefined }> {
  if (check.sure) return { feed: await check.feed, response: undefined }
  let response = await task.text(url)
  for (let name of check.names) {
    let detected: false | DetectedFeed
    try {
      detected = await loaders[name].detectFeedInPage(task, response, url)
    } catch {
      detected = false
    }
    if (detected !== false) {
      return { feed: toFeedLoader(name, detected, response.url), response }
    }
  }
  return { feed: false, response }
}

export async function tryLoadFeedData(
  task: DownloadTask,
  loader: LoaderName,
  url: string,
  opts?: { account?: AccountValue; response?: TextResponse }
): Promise<FeedData | undefined> {
  if (isSaveData()) return undefined
  try {
    return await loaders[loader].loadFeedData(task, url, opts)
  } catch (e) {
    if (!isRemoteError(e)) getEnvironment().warn(e)
    return undefined
  }
}
