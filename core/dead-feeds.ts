import { atom } from 'nanostores'

import type { FeedValue } from './feed.ts'
import { nowInSeconds } from './lib/date.ts'
import { waitLoading } from './lib/stores.ts'
import { getMissingSince } from './missing-feeds.ts'
import { deadFeedsSeenAt, syncedSettingsLoading } from './settings.ts'

const YEAR = 365 * 86400

export type DeadFeed =
  | { lastPost: number; since: number; type: 'twoYears' | 'year' }
  | { since: number; type: 'missing' }

export function getDeadFeed(
  feed: FeedValue,
  now: number
): DeadFeed | undefined {
  let missingSince = getMissingSince(feed)
  if (missingSince) return { since: missingSince, type: 'missing' }
  let lastPost = feed.lastPublishedAt
  if (!lastPost || now - lastPost <= YEAR) return undefined
  return {
    lastPost,
    since: lastPost + YEAR,
    type: now - lastPost > 2 * YEAR ? 'twoYears' : 'year'
  }
}

export const manyDeadFeeds = atom(false)

deadFeedsSeenAt.listen(() => {
  manyDeadFeeds.set(false)
})

export async function markDeadFeedsSeen(): Promise<void> {
  await waitLoading(syncedSettingsLoading)
  deadFeedsSeenAt.set(nowInSeconds())
}

export function checkDeadFeeds(feeds: FeedValue[]): void {
  let now = Date.now() / 1000
  let seenAt = deadFeedsSeenAt.get()
  let missing = 0
  let silent = 0
  for (let feed of feeds) {
    let dead = getDeadFeed(feed, now)
    // User could decide to keep feeds, which they saw on the Dead feeds page
    if (!dead || dead.since <= seenAt) continue
    if (dead.type === 'missing') {
      missing += 1
    } else {
      silent += 1
    }
  }
  manyDeadFeeds.set(missing > 2 || (silent > 10 && silent > feeds.length / 10))
}
