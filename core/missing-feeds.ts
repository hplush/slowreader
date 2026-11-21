import { HTTPStatusError, isNoDomainError } from './errors.ts'
import { changeFeed, type FeedValue } from './feed.ts'
import { isObject } from './loader/common.ts'
import { isWebFeed } from './loader/index.ts'

const MISSING_AFTER = 3 * 24 * 60 * 60

type TrackedFeed = Pick<FeedValue, 'id' | 'loader' | 'loaderData'>

interface FeedErrors {
  failedSince: number
  missing: boolean
}

/**
 * Web feeds have no other loader data, so the whole `loaderData` is the record
 * about refresh errors. It is synced to show missing feeds on every device.
 */
function getErrors(feed: TrackedFeed): FeedErrors | undefined {
  if (!isWebFeed(feed.loader) || !feed.loaderData) return undefined
  try {
    let data: unknown = JSON.parse(feed.loaderData)
    if (
      isObject(data) &&
      typeof data.failedSince === 'number' &&
      typeof data.missing === 'boolean'
    ) {
      return { failedSince: data.failedSince, missing: data.missing }
    }
  } catch {}
  return undefined
}

/**
 * Site can lose the feed, the domain, or the posts for a short time, so
 * the feed is missing only if it is still lost 3 days after the first check.
 */
export async function trackMissingFeed(feed: TrackedFeed): Promise<void> {
  if (!isWebFeed(feed.loader)) return
  let errors = getErrors(feed)
  let now = Math.round(Date.now() / 1000)
  if (!errors) {
    errors = { failedSince: now, missing: false }
  } else if (!errors.missing && now - errors.failedSince > MISSING_AFTER) {
    errors = { ...errors, missing: true }
  } else {
    return
  }
  await changeFeed(feed.id, { loaderData: JSON.stringify(errors) })
}

export async function trackFeedError(
  feed: TrackedFeed,
  error: Error
): Promise<void> {
  if (HTTPStatusError.is(error, [404, 410]) || isNoDomainError(error)) {
    await trackMissingFeed(feed)
  }
}

export function getMissingSince(feed: TrackedFeed): number | undefined {
  let errors = getErrors(feed)
  return errors?.missing ? errors.failedSince + MISSING_AFTER : undefined
}

export function isFailingFeed(feed: TrackedFeed): boolean {
  return !!getErrors(feed)
}

export async function forgetFeedError(feed: TrackedFeed): Promise<void> {
  if (getErrors(feed)) await changeFeed(feed.id, { loaderData: null })
}
