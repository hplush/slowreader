import { persistentAtom } from '@nanostores/persistent'

import { type FeedValue, moveFeed } from './feed.ts'
import type { DownloadTask } from './lib/download.ts'

type FeedRedirect = [url: string, since: number]

/**
 * Per device, since redirects could depend on the network, and records
 * must not create sync actions.
 */
export const feedRedirects = persistentAtom<Record<string, FeedRedirect>>(
  'slowreader:feedRedirects',
  {},
  { decode: JSON.parse, encode: JSON.stringify }
)

function setRecord(feedId: string, record: FeedRedirect | undefined): void {
  let records = { ...feedRedirects.get() }
  if (record) {
    records[feedId] = record
  } else {
    delete records[feedId]
  }
  feedRedirects.set(records)
}

/**
 * Site owner can lose the domain for a short time, so the feed moves only
 * after the same permanent redirect lasts for 3 days.
 */
export async function trackFeedRedirect(
  feed: FeedValue,
  task: DownloadTask
): Promise<void> {
  if (!['atom', 'jsonFeed', 'rss', 'rss1'].includes(feed.loader)) return
  let redirect = task.redirects.get(feed.url)
  let record = feedRedirects.get()[feed.id]
  if (!redirect?.permanent) {
    if (record) setRecord(feed.id, undefined)
  } else if (record?.[0] !== redirect.url) {
    setRecord(feed.id, [redirect.url, Date.now()])
  } else if (Date.now() - record[1] > 3 * 24 * 60 * 60_000) {
    setRecord(feed.id, undefined)
    await moveFeed(feed, {
      avatar: feed.avatar ?? undefined,
      loaderData: feed.loaderData ?? undefined,
      title: feed.originTitle ?? feed.title,
      url: redirect.url
    })
  }
}

export function cleanFeedRedirects(feeds: Pick<FeedValue, 'id'>[]): void {
  let ids = new Set(feeds.map(feed => feed.id))
  let records = feedRedirects.get()
  if (Object.keys(records).every(id => ids.has(id))) return
  feedRedirects.set(
    Object.fromEntries(Object.entries(records).filter(([id]) => ids.has(id)))
  )
}
