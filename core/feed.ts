import { withMeta, type WithoutMeta } from '@logux/client/db'
import type { SqlStore } from '@nanostores/sql'
import { atom, onMount, type ReadableAtom } from 'nanostores'

import { createDownloadTask, type TextResponse } from './lib/download.ts'
import { firstRow } from './lib/stores.ts'
import { type FeedLoader, loaders } from './loader/index.ts'
import { deletePost, loadPostIdsByFeed, recalcPostsReading } from './post.ts'
import type { PostsList } from './posts-list.ts'
import {
  type FeedChanges,
  type FeedValue,
  getDatabase,
  getTables,
  type NewFeed,
  select
} from './schema.ts'

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

export function loadFeedsByCategory(categoryId: string): Promise<FeedValue[]> {
  return select<FeedValue>`
    SELECT * FROM "feeds" WHERE "categoryId" = ${categoryId} ORDER BY "title"
  `
}

export function loadFeedByUrl(url: string): Promise<FeedValue | undefined> {
  return select<FeedValue>`SELECT * FROM "feeds" WHERE "url" = ${url}`.then(
    rows => rows[0]
  )
}

export function addFeed(fields: NewFeed): Promise<string> {
  return getTables().feeds.create(fields)
}

export async function deleteFeed(feedId: string): Promise<void> {
  await deletePost(await loadPostIdsByFeed(feedId))
  return getTables().feeds.delete(feedId)
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

  return await addFeed({
    categoryId: 'general',
    lastOriginId: lastPost?.originId,
    lastPublishedAt: lastPost?.publishedAt ?? Math.round(Date.now() / 1000),
    loader: candidate.name,
    reading: 'slow',
    title: candidate.title,
    url: candidate.url,
    ...fields
  })
}

export function getFeedLatestPosts(
  feed: FeedValue,
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
    categoryId: 'general',
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

export const needWelcome = atom<boolean | undefined>()
onMount(needWelcome, () => {
  let $total = getDatabase().store<{
    total: number
  }>`SELECT COUNT("url") AS "total" FROM "feeds"`
  return $total.subscribe(value => {
    needWelcome.set(value.isLoading ? undefined : value.value[0]!.total === 0)
  })
})
