import type { SqlStore } from '@nanostores/sql'
import { atom, computed, effect, onMount, type ReadableAtom } from 'nanostores'

import { onClient } from './client.ts'
import { currentDay, nowInSeconds } from './lib/date.ts'
import { warnIfOpened } from './lib/sign-out.ts'
import {
  getCrdt,
  getTables,
  hasDatabase,
  lazyDbQuery,
  type NewReaction,
  openedDatabase,
  type PostInterest,
  type ReactionType,
  type ReactionValue
} from './schema.ts'
import {
  deleteOrphanSeen,
  deleteSeen,
  getSeen,
  maxSeen,
  moveSeen,
  STATS_DAYS
} from './views.ts'

export type { PostInterest, ReactionType, ReactionValue }

/**
 * Only posts of followed feeds have reactions.
 */
export type ReactedPost = { feedId: string; id: string; url?: null | string }

export function getReaction(
  postId: string
): SqlStore<ReactionValue | undefined> {
  return getTables().reactions.row(postId)
}

/**
 * Post, which was deleted after reading, can be found only by its URL.
 */
export function loadReactedByUrl(
  url: string
): Promise<ReactedPost | undefined> {
  return getTables().reactions.load`WHERE "url" = ${url} LIMIT 1`.then(
    ([reaction]) => {
      return reaction && { feedId: reaction.feedId, id: reaction.id, url }
    }
  )
}

export function loadReactions(): Promise<ReactionValue[]> {
  return getTables().reactions.load`ORDER BY "at" DESC, "id"`
}

export function addReaction(reactions: NewReaction[]): Promise<string[]> {
  return getTables().reactions.create(reactions)
}

/**
 * Likes and dislikes of the feed, newest first.
 */
export function getFeedReactions(feedId: string): SqlStore<ReactionValue[]> {
  return getTables().reactions.select`
    WHERE "feedId" = ${feedId} AND "type" IN ('like', 'dislike')
    ORDER BY "at" DESC
  `
}

/**
 * What user can choose for a post. `open` is for all reactions, which the app
 * sets by itself, when user opened, shared the post or opened a link from it.
 */
export type PostReaction = 'dislike' | 'like' | 'none' | 'open'

export function getPostReaction(
  reaction: ReactionValue | undefined
): PostReaction {
  let type = reaction?.type ?? 'none'
  return type === 'link' || type === 'share' ? 'open' : type
}

/**
 * `none` keeps the row, so the app will not set its own reaction again
 * on the next opening of the post.
 */
export async function setPostReaction(
  post: ReactedPost,
  type: PostReaction
): Promise<void> {
  let reactions = getTables().reactions
  let fields = {
    at: nowInSeconds(),
    type,
    url: type === 'like' || type === 'dislike' ? post.url : undefined
  }
  if (await reactions.get(post.id)) {
    await reactions.update(post.id, fields)
  } else if (type !== 'none') {
    await reactions.create({ ...fields, feedId: post.feedId, id: post.id })
  }
}

/**
 * User opened, shared the post or opened a link from it. It never replaces
 * a choice, which user already made for the post, and does not wait
 * for the database to not delay the action itself.
 */
export function trackInterest(
  post: { feedId?: null | string; id: string },
  type: PostInterest
): void {
  let { feedId, id } = post
  if (!feedId || !hasDatabase()) return
  let reactions = getTables().reactions
  reactions
    .get(id)
    .then(async reaction => {
      if (!reaction) {
        await reactions.create({ at: nowInSeconds(), feedId, id, type })
      }
    })
    .catch(warnIfOpened)
}

/**
 * Likes (`true`) and dislikes of posts, which are still in the database,
 * for post cards.
 */
export const likedPosts = lazyDbQuery(
  () => getTables().reactions.select`
    WHERE "type" IN ('like', 'dislike') AND "id" IN (SELECT "id" FROM "posts")
  `,
  rows => new Map(rows.map(row => [row.id, row.type === 'like']))
)

export interface FeedStats {
  disliked: number
  liked: number
  max: number
  opened: number
  seen: number
}

function getStatsTotal(stats: FeedStats): number {
  // User can react to a post without marking it as read
  return Math.max(stats.seen, stats.liked + stats.opened + stats.disliked)
}

function countStats(
  feedIds: readonly string[],
  day: number
): ReadableAtom<ReadonlyMap<string, FeedStats>> {
  let $reacted = lazyDbQuery(
    db => db.store<{ count: number; feedId: string; type: ReactionType }>`
      SELECT "feedId", "type", COUNT("id") AS "count" FROM "reactions"
      WHERE "at" >= ${(day - STATS_DAYS + 1) * 86400} AND "type" <> 'none'
        AND "feedId" IN (
          SELECT "value" FROM json_each(${JSON.stringify(feedIds)})
        )
      GROUP BY "feedId", "type"
    `
  )
  return computed(
    [$reacted, getSeen(feedIds, day), maxSeen],
    (reacted, seen, mostSeen) => {
      let stats = new Map(
        feedIds.map((feedId): [string, FeedStats] => [
          feedId,
          {
            disliked: 0,
            liked: 0,
            max: 0,
            opened: 0,
            seen: seen.get(feedId) ?? 0
          }
        ])
      )
      for (let { count, feedId, type } of reacted ?? []) {
        let value = stats.get(feedId)!
        if (type === 'like') {
          value.liked += count
        } else if (type === 'dislike') {
          value.disliked += count
        } else {
          value.opened += count
        }
      }
      // The scale from the database can be behind feeds on the screen
      let max = mostSeen
      for (let value of stats.values()) {
        max = Math.max(max, getStatsTotal(value))
      }
      for (let value of stats.values()) value.max = max
      return stats
    }
  )
}

/**
 * What user did with posts of these feeds for the last 90 days. Every post
 * is counted once in reactions.
 *
 * The database counts only the asked feeds, and the scale is one number,
 * so nothing in the memory grows with the number of user’s feeds.
 */
export function getFeedStats(
  $feedIds: ReadableAtom<readonly string[]>
): ReadableAtom<ReadonlyMap<string, FeedStats>> {
  let $stats = atom<ReadonlyMap<string, FeedStats>>(new Map())
  onMount($stats, () => {
    let counted: string | undefined
    let unbindStats = (): void => {}
    let unbindSources = effect([$feedIds, currentDay], (feedIds, day) => {
      // Minute tick or change of other feed’s fields should not ask
      // the database again
      if (`${day} ${feedIds.join(' ')}` === counted) return
      counted = `${day} ${feedIds.join(' ')}`
      unbindStats()
      unbindStats = countStats(feedIds, day).subscribe(stats => {
        $stats.set(stats)
      })
    })
    return () => {
      unbindSources()
      unbindStats()
    }
  })
  return $stats
}

export type FeedStatsType = 'disliked' | 'liked' | 'opened' | 'other'

export interface FeedStatsBar {
  parts: { count: number; type: FeedStatsType }[]
  total: number
  /**
   * In percents of the most read feed.
   */
  width: number
}

export function getFeedStatsBar(stats: FeedStats): FeedStatsBar {
  let total = getStatsTotal(stats)
  return {
    parts: (
      [
        ['liked', stats.liked],
        ['opened', stats.opened],
        ['other', total - stats.liked - stats.opened - stats.disliked],
        ['disliked', stats.disliked]
      ] as const
    )
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ count, type })),
    total,
    width: stats.max > 0 ? Math.min(100, (total / stats.max) * 100) : 0
  }
}

export async function deleteFeedStats(feedIds: string[]): Promise<void> {
  if (feedIds.length === 0) return
  await getTables().reactions.deleteWhere`
    "feedId" IN (SELECT "value" FROM json_each(${JSON.stringify(feedIds)}))
  `
  await deleteSeen(feedIds)
}

export async function moveFeedStats(from: string, to: string): Promise<void> {
  await getTables().reactions.updateWhere({ feedId: to })`
    "feedId" = ${from}
  `
  await moveSeen(from, to)
}

/**
 * Device, which was offline during the unfollow, could bring the statistics
 * of the deleted feed back.
 */
export async function deleteOrphanStats(): Promise<void> {
  await getTables().reactions.deleteWhere`
    "feedId" NOT IN (SELECT "id" FROM "feeds")
  `
  await deleteOrphanSeen()
}

onClient(() =>
  effect(openedDatabase, db => {
    if (!db) return
    getCrdt()
      .ready.then(() => {
        return getTables().reactions.deleteWhere`
          "type" NOT IN ('like', 'dislike')
            AND "at" <= ${nowInSeconds() - STATS_DAYS * 86400}
        `
      })
      .catch(warnIfOpened)
  })
)
