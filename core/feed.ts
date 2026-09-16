import { withMeta, type WithoutMeta } from '@logux/client/db'
import { persistentAtom } from '@nanostores/persistent'
import type { Database, SqlStore } from '@nanostores/sql'
import { computed, effect, type ReadableAtom } from 'nanostores'

import { onClient } from './client.ts'
import { createDownloadTask, type TextResponse } from './lib/download.ts'
import { firstRow } from './lib/stores.ts'
import { type FeedLoader, loaders } from './loader/index.ts'
import {
  addPost,
  deletePost,
  loadPostIds,
  processOriginPost,
  recalcPostsReading
} from './post.ts'
import type { PostsList } from './posts-list.ts'
import {
  type FeedChanges,
  type FeedValue,
  GENERAL_CATEGORY,
  getCrdt,
  getTables,
  openedDatabase,
  type NewFeed,
  select
} from './schema.ts'
import { isDemo } from './settings.ts'

export type { FeedValue, NewFeed }

export function getFeed(feedId: string): ReadableAtom<FeedValue | undefined> {
  return firstRow(getTables().feeds.select`WHERE "id" = ${feedId}`)
}

export function getFeeds(): SqlStore<FeedValue[]> {
  return getTables().feeds.select`ORDER BY "title"`
}

export function getFeedsByUrl(url: string): SqlStore<FeedValue[]> {
  return getTables().feeds.select`WHERE "url" = ${url}`
}

export function loadFeed(feedId: string): Promise<FeedValue | undefined> {
  return select<FeedValue>`SELECT * FROM "feeds" WHERE "id" = ${feedId}`.then(
    rows => rows[0]
  )
}

export function loadFeeds(): Promise<FeedValue[]> {
  return select<FeedValue>`SELECT * FROM "feeds" ORDER BY "title"`
}

/**
 * Feed’s columns used during the refresh. `SELECT *` returns also
 * `updatedAt_*` column of every field, and the list of all feeds
 * is kept in memory until the refresh ends.
 */
export type RefreshFeed = Pick<
  FeedValue,
  | 'id'
  | 'lastOriginId'
  | 'lastPublishedAt'
  | 'loader'
  | 'refreshedAt'
  | 'title'
  | 'url'
>

export function loadFeedsForRefresh(): Promise<RefreshFeed[]> {
  return select<RefreshFeed>`
    SELECT "id", "title", "url", "loader", "refreshedAt",
      "lastOriginId", "lastPublishedAt"
    FROM "feeds" ORDER BY "title"
  `
}

export function loadFeedsByCategory(categoryId: string): Promise<FeedValue[]> {
  return select<FeedValue>`
    SELECT * FROM "feeds" WHERE "categoryId" = ${categoryId} ORDER BY "title"
  `
}

export function loadFeedUrls(): Promise<string[]> {
  return select<Pick<FeedValue, 'url'>>`SELECT "url" FROM "feeds"`.then(rows =>
    rows.map(row => row.url)
  )
}

export function loadFeedByUrl(url: string): Promise<FeedValue | undefined> {
  return select<FeedValue>`SELECT * FROM "feeds" WHERE "url" = ${url}`.then(
    rows => rows[0]
  )
}

export function addFeed(feeds: NewFeed[]): Promise<string[]>
export function addFeed(fields: NewFeed): Promise<string>
export function addFeed(
  fields: NewFeed | NewFeed[]
): Promise<string[] | string> {
  return getTables().feeds.create(fields)
}

export async function deleteFeed(feedId: string): Promise<void> {
  await deletePost(await loadPostIds({ feed: feedId }))
  return getTables().feeds.delete(feedId)
}

export async function deleteAllFeeds(): Promise<void> {
  await deletePost(await loadPostIds())
  let feeds = await select<{ id: string }>`SELECT "id" FROM "feeds"`
  await getTables().feeds.delete(feeds.map(feed => feed.id))
}

export async function changeFeed(
  feedId: string[] | string,
  changes: FeedChanges
): Promise<void> {
  await getTables().feeds.update(feedId, changes)
  if (changes.reading) {
    await Promise.all([feedId].flat().map(id => recalcPostsReading(id)))
  }
}

/**
 * Subscribes to a feed which is currently being previewed.
 */
export async function addCandidate(
  candidate: FeedLoader,
  fields: Partial<NewFeed> = {},
  task = createDownloadTask(),
  response?: TextResponse
): Promise<string> {
  let posts = candidate.loader.getPosts(task, candidate.url, response)
  if (posts.get().isLoading) await posts.loading
  let lastPost = posts.get().list[0]

  let feed = {
    categoryId: GENERAL_CATEGORY,
    lastOriginId: lastPost?.originId,
    lastPublishedAt: lastPost?.publishedAt ?? Math.round(Date.now() / 1000),
    loader: candidate.name,
    reading: 'slow' as const,
    title: candidate.title,
    url: candidate.url,
    ...fields
  }
  let feedId = await addFeed(feed)
  await addPost(
    posts
      .get()
      .list.slice(0, 10)
      .map(origin => processOriginPost(origin, feedId, feed.reading))
  )
  return feedId
}

export function getFeedLatestPosts(
  feed: Pick<FeedValue, 'loader' | 'refreshedAt' | 'url'>,
  task = createDownloadTask()
): PostsList {
  return loaders[feed.loader].getPosts(
    task,
    feed.url,
    undefined,
    feed.refreshedAt ?? undefined
  )
}

let testFeedId = 0

export function testFeed(
  feed: Partial<WithoutMeta<FeedValue>> = {}
): FeedValue {
  testFeedId += 1
  return withMeta<FeedValue>({
    categoryId: GENERAL_CATEGORY,
    fastReader: null,
    id: `feed-${testFeedId}`,
    lastOriginId: null,
    lastPublishedAt: null,
    loader: 'rss',
    reading: 'fast',
    refreshedAt: null,
    slowReader: null,
    title: `Test ${testFeedId}`,
    url: `http://example.com/${testFeedId}`,
    ...feed
  })
}

export const hasFeeds = persistentAtom<boolean | undefined>(
  'slowreader:feeds',
  undefined,
  {
    decode: value => value === 'yes',
    encode(value) {
      if (typeof value === 'undefined') return undefined
      return value ? 'yes' : ''
    }
  }
)

function hasAnyFeed(db: Database): Promise<boolean> {
  return db.select<{ id: string }>`SELECT "id" FROM "feeds" LIMIT 1`.then(
    rows => rows.length > 0
  )
}

onClient(() => {
  let unbindCheck = effect([openedDatabase, hasFeeds], (db, known) => {
    if (!db || typeof known !== 'undefined') return
    void getCrdt().ready.then(async () => {
      let found = await hasAnyFeed(db)
      // A feed could be added while the query was running
      if (typeof hasFeeds.get() === 'undefined') hasFeeds.set(found)
    })
  })

  let unbindActions = effect(openedDatabase, db => {
    if (!db) return
    // Action types are strings to avoid circle dependency with schema.ts
    return getCrdt().on('applied', (tx, action) => {
      if (action.type === 'feeds/created') {
        hasFeeds.set(true)
      } else if (action.type === 'feeds/deleted') {
        // The deletion is applied asynchronously, so the rest of the feeds
        // can be counted only inside the applying transaction
        return hasAnyFeed(tx).then(found => {
          hasFeeds.set(found)
        })
      }
    })
  })

  return () => {
    unbindCheck()
    unbindActions()
  }
})

export const needWelcome = computed([hasFeeds, isDemo], (feeds, demo) => {
  if (demo) return true
  return typeof feeds === 'undefined' ? undefined : !feeds
})
