import { withMeta, type WithoutMeta } from '@logux/client/db'
import { persistentAtom } from '@nanostores/persistent'
import type { Database, SqlStore } from '@nanostores/sql'
import { effect } from 'nanostores'

import { onClient } from './client.ts'
import { createDownloadTask, type TextResponse } from './lib/download.ts'
import { findSiteIcon, isLoadableIcon } from './loader/common.ts'
import { type FeedLoader, loaders } from './loader/index.ts'
import { addPost, processOriginPost, recalcPostsReading } from './post.ts'
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

export function loadFeedsForRefresh(): Promise<RefreshFeed[]> {
  return getCrdt().select<RefreshFeed>`
    SELECT "id", "title", "url", "loader", "loaderData", "refreshedAt",
      "lastOriginId", "lastPublishedAt"
    FROM "feeds" ORDER BY "title"
  `
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
    lastPublishedAt: lastPost?.publishedAt ?? Math.round(Date.now() / 1000),
    loader: candidate.name,
    loaderData,
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

async function findFeedAvatar(
  feed: Pick<FeedValue, 'loader' | 'url'>
): Promise<string | undefined> {
  let task = createDownloadTask({ tries: 1 })
  try {
    let fromFeed = loaders[feed.loader].getAvatarFromText(
      await task.text(feed.url)
    )
    if (fromFeed && (await isLoadableIcon(task, fromFeed))) return fromFeed
  } catch {}
  return findSiteIcon(task, feed.url)
}

/**
 * Searches are kept for the whole session, since every render of the feed
 * with a missed or broken icon asks for it again.
 */
let avatarSearches = new Map<string, Promise<void>>()

onClient(() => () => {
  avatarSearches.clear()
})

/**
 * Look for the feed’s icon again, since the site could change it.
 */
export function updateFeedAvatar(feedId: string): Promise<void> {
  let search = avatarSearches.get(feedId)
  if (!search) {
    search = loadFeed(feedId).then(async feed => {
      if (!feed) return
      let avatar = (await findFeedAvatar(feed)) ?? null
      // The user could sign out or delete the feed during the search
      if (!hasDatabase() || avatar === feed.avatar) return
      if (await loadFeed(feedId)) {
        await changeFeed(feedId, { avatar })
      }
    })
    avatarSearches.set(feedId, search)
  }
  return search
}

let testFeedId = 0

export function testFeed(
  feed: Partial<WithoutMeta<FeedValue>> = {}
): FeedValue {
  testFeedId += 1
  return withMeta<FeedValue>({
    avatar: null,
    categoryId: GENERAL_CATEGORY,
    fastReader: null,
    id: `feed-${testFeedId}`,
    lastOriginId: null,
    lastPublishedAt: null,
    loader: 'rss',
    loaderData: null,
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
