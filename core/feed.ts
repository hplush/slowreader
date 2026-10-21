import { withMeta, type WithoutMeta } from '@logux/client/db'
import { persistentAtom } from '@nanostores/persistent'
import type { Database, SqlStore } from '@nanostores/sql'
import { effect } from 'nanostores'

import { onClient } from './client.ts'
import { createDownloadTask, type TextResponse } from './lib/download.ts'
import { type FeedLoader, loaders, tryLoadFeedData } from './loader/index.ts'
import {
  addPost,
  collapseThreads,
  getSortedAt,
  processOriginPost,
  recalcPostsReading
} from './post.ts'
import type { PostsList } from './posts-list.ts'
import {
  type FeedChanges,
  feedsTable,
  type FeedValue,
  GENERAL_CATEGORY,
  getCrdt,
  getTables,
  hasDatabase,
  isReady,
  openedDatabase,
  type NewFeed
} from './schema.ts'
import { linkThreads } from './thread.ts'

export type { FeedValue, NewFeed }

export function getFeed(feedId: string): SqlStore<FeedValue | undefined> {
  return getTables().feeds.row(feedId)
}

export function getFeeds(): SqlStore<FeedValue[]> {
  return getTables().feeds.select`ORDER BY "title"`
}

export function getFeedsByUrl(url: string): SqlStore<FeedValue[]> {
  return getTables().feeds.select`WHERE "url" = ${url}`
}

export function loadFeed(feedId: string): Promise<FeedValue | undefined> {
  return getTables().feeds.get(feedId)
}

export function loadFeeds(): Promise<FeedValue[]> {
  return getTables().feeds.load`ORDER BY "title"`
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
  | 'loaderData'
  | 'refreshedAt'
  | 'title'
  | 'url'
>

/**
 * Feeds with `accountId` get posts from the account’s home timeline.
 */
export function loadFeedsForRefresh(): Promise<RefreshFeed[]> {
  return getCrdt().select<RefreshFeed>`
    SELECT "id", "title", "url", "loader", "loaderData", "refreshedAt",
      "lastOriginId", "lastPublishedAt"
    FROM "feeds" WHERE "accountId" IS NULL ORDER BY "title"
  `
}

export type FeedByUrl = Pick<
  FeedValue,
  'accountId' | 'id' | 'loader' | 'reading' | 'url'
>

/**
 * Home timeline puts posts to feeds by author’s URL.
 */
export function loadFeedsByUrls(): Promise<Map<string, FeedByUrl>> {
  return getCrdt().select<FeedByUrl>`
      SELECT "id", "url", "accountId", "loader", "reading" FROM "feeds"
    `.then(rows => new Map(rows.map(row => [row.url, row])))
}

export function loadFeedsByCategory(categoryId: string): Promise<FeedValue[]> {
  return getTables().feeds.load`
    WHERE "categoryId" = ${categoryId} ORDER BY "title"
  `
}

export function loadFeedUrls(): Promise<string[]> {
  return getCrdt().select<
    Pick<FeedValue, 'url'>
  >`SELECT "url" FROM "feeds"`.then(rows => rows.map(row => row.url))
}

export function loadFeedByUrl(url: string): Promise<FeedValue | undefined> {
  return getTables().feeds.load`WHERE "url" = ${url}`.then(rows => rows[0])
}

export function addFeed(feeds: NewFeed[]): Promise<string[]>
export function addFeed(fields: NewFeed): Promise<string>
export function addFeed(
  fields: NewFeed | NewFeed[]
): Promise<string[] | string> {
  return getTables().feeds.create(fields)
}

export async function deleteFeed(feedId: string): Promise<void> {
  await getTables().posts.deleteWhere`"feedId" = ${feedId}`
  return getTables().feeds.delete(feedId)
}

export async function deleteAllFeeds(): Promise<void> {
  await getTables().posts.deleteWhere()
  await getTables().feeds.deleteWhere()
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
  let loaderData = await candidate.loader
    .getLoaderData?.(task, candidate.url)
    // getPosts() will look for it again and will show the error
    .catch(() => undefined)
  let posts = candidate.loader.getPosts(
    task,
    candidate.url,
    response,
    undefined,
    loaderData
  )
  if (posts.get().isLoading) await posts.loading
  let lastPost = posts.get().list[0]

  let feed = {
    categoryId: GENERAL_CATEGORY,
    lastOriginId: lastPost?.originId,
    lastPublishedAt:
      (lastPost && getSortedAt(lastPost)) ?? Math.round(Date.now() / 1000),
    loader: candidate.name,
    loaderData,
    originTitle: candidate.title,
    reading: 'slow' as const,
    title: candidate.title,
    url: candidate.url,
    ...fields
  }
  let feedId = await addFeed(feed)
  let linked = await linkThreads(
    task,
    { id: feedId, loader: feed.loader, url: feed.url },
    collapseThreads(posts.get().list)
      .slice(0, 10)
      .flatMap(({ threadParts, ...start }) => [start, ...(threadParts ?? [])])
  )
  await addPost(
    linked.map(origin => processOriginPost(origin, { feedId }, feed.reading))
  )
  return feedId
}

export function getFeedLatestPosts(
  feed: Pick<FeedValue, 'loader' | 'loaderData' | 'refreshedAt' | 'url'>,
  task = createDownloadTask()
): PostsList {
  return loaders[feed.loader].getPosts(
    task,
    feed.url,
    undefined,
    feed.refreshedAt ?? undefined,
    feed.loaderData
  )
}

/**
 * Updates are kept for the whole session, since every render of the feed
 * with a missed or broken icon asks for it again.
 */
let dataUpdates = new Map<string, Promise<string | undefined>>()

onClient(() => () => {
  dataUpdates.clear()
})

/**
 * Author could change the name or avatar, and the site could change the icon
 * after the subscription. Returns the actual avatar.
 */
export function updateFeedData(
  feedId: string,
  response?: TextResponse
): Promise<string | undefined> {
  let update = dataUpdates.get(feedId)
  if (!update) {
    update = loadFeed(feedId).then(async feed => {
      if (!feed) return undefined
      let task = createDownloadTask({ tries: 1 })
      let data = await tryLoadFeedData(task, feed.loader, feed.url, {
        response
      })
      // Keep the saved data, if the feed is offline
      if (!data) return feed.avatar ?? undefined
      let changes: FeedChanges = {}
      let avatar = data.avatar ?? null
      if (avatar !== feed.avatar) changes.avatar = avatar
      let title = data.title.trim()
      if (title && title !== feed.originTitle) {
        changes.originTitle = title
        // Keep the title, which user set
        if (feed.title === feed.originTitle) changes.title = title
      }
      // User could delete the feed or sign out during the loading
      if (
        Object.keys(changes).length > 0 &&
        hasDatabase() &&
        (await loadFeed(feedId))
      ) {
        await changeFeed(feedId, changes)
      }
      return data.avatar
    })
    dataUpdates.set(feedId, update)
  }
  return update
}

let testFeedId = 0

export function testFeed(
  feed: Partial<WithoutMeta<FeedValue>> = {}
): FeedValue {
  testFeedId += 1
  return withMeta<FeedValue>({
    accountId: null,
    avatar: null,
    categoryId: GENERAL_CATEGORY,
    fastReader: null,
    id: `feed-${testFeedId}`,
    lastOriginId: null,
    lastPublishedAt: null,
    loader: 'rss',
    loaderData: null,
    originTitle: null,
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
    let crdt = getCrdt()
    void crdt.ready.then(async () => {
      if (!isReady(crdt)) return
      let found = await hasAnyFeed(db)
      // A feed could be added while the query was running
      if (typeof hasFeeds.get() === 'undefined') hasFeeds.set(found)
    })
  })

  let unbindActions = effect(openedDatabase, db => {
    if (!db) return
    return getCrdt().on('applied', (tx, action) => {
      if (feedsTable.created.match(action)) {
        hasFeeds.set(true)
      } else if (feedsTable.deleted.match(action)) {
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
