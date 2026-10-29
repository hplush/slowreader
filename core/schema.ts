// Single place with all database tables. Every table is a CRDT LWW map
// on top of SQL database, which is filled by actions from Logux log.

import type { CrossTabClient } from '@logux/client'
import {
  bigint,
  boolean,
  type CrdtDatabase,
  type CrdtJsonType,
  type NewCrdtRow,
  type CrdtRowFields,
  type CrdtTable,
  type CrdtTableRow,
  createCrdtDatabase,
  crdtTableToActions,
  defineCrdtTable,
  json,
  number,
  oneOf,
  optional,
  string
} from '@logux/client/db'
import type { Action, MetaTime } from '@logux/core'
import type { Database } from '@nanostores/sql'
import { atom, effect } from 'nanostores'

import { busyDuring } from './busy.ts'
import {
  database,
  onClient,
  receivingProgress,
  resetDatabase
} from './client.ts'
import { getEnvironment } from './environment.ts'
import { fatal } from './errors.ts'
import type { LoaderName } from './loader/index.ts'
import { type LogTracker, trackLog } from './log.ts'
import { commonMessages } from './messages/index.ts'
import type { UsefulReaderName } from './readers/common.ts'
import {
  downloadingCloudData,
  hasCloud,
  uploadingLocalData
} from './settings.ts'

/**
 * ID of the virtual category for feeds without a category. Two underscores
 * to not be taken by a user’s category, which has a random ID.
 */
export const GENERAL_CATEGORY = '__general'

const READERS = ['feed', 'list'] as const satisfies readonly UsefulReaderName[]

const READINGS = ['fast', 'slow'] as const

export const ACCOUNT_SERVICES = ['mastodon', 'bluesky'] as const

export type AccountService = (typeof ACCOUNT_SERVICES)[number]

/**
 * Private JWK of the DPoP key. It is synced, so another device could use
 * the tokens bound to it.
 */
let dpopKeyShape = {
  crv: string(),
  d: string(),
  kty: string(),
  x: string(),
  y: string()
}

let credentialsShape = {
  accessToken: string(),
  clientId: string(),
  clientSecret: optional(string()),
  dpopKey: optional(json(dpopKeyShape)),
  expiresAt: optional(bigint()),
  refreshToken: optional(string()),
  tokenUrl: string()
}

export type AccountCredentials = CrdtJsonType<typeof credentialsShape>
export type DpopKey = CrdtJsonType<typeof dpopKeyShape>

export const accountsTable = defineCrdtTable(
  'accounts',
  {
    avatar: optional(string()),
    categoryId: string({ default: GENERAL_CATEGORY }),
    credentials: json(credentialsShape),
    expired: boolean({ default: false }),
    follow: boolean({ default: false }),
    handle: string(),
    lastOriginId: optional(string()),
    lastPublishedAt: optional(bigint()),
    refreshedAt: optional(bigint()),
    server: string(),
    service: oneOf(ACCOUNT_SERVICES),
    title: string(),
    url: string()
  },
  ['title']
)

export const categoriesTable = defineCrdtTable(
  'categories',
  {
    fastReader: optional(oneOf(READERS)),
    slowReader: optional(oneOf(READERS)),
    title: string()
  },
  ['title']
)

export const feedsTable = defineCrdtTable(
  'feeds',
  {
    accountId: optional(string()),
    avatar: optional(string()),
    categoryId: string({ default: GENERAL_CATEGORY }),
    fastReader: optional(oneOf(READERS)),
    lastOriginId: optional(string()),
    lastPublishedAt: optional(bigint()),
    loader: string<LoaderName>(),
    loaderData: optional(string()),
    originTitle: optional(string()),
    reading: oneOf(READINGS, { default: 'slow' }),
    refreshedAt: optional(bigint()),
    slowReader: optional(oneOf(READERS)),
    title: string(),
    url: string()
  },
  [
    // Category reader and feeds list
    ['categoryId', 'title'],
    // Duplicate check on adding a feed and on OPML import
    'url',
    'title'
  ]
)

export const filtersTable = defineCrdtTable(
  'filters',
  {
    action: oneOf(['delete', 'fast', 'slow']),
    feedId: string(),
    priority: number(),
    query: string()
  },
  [
    // Filters of the feed in their order
    ['feedId', 'priority']
  ]
)

let authorShape = {
  avatar: optional(string()),
  title: string(),
  url: optional(string())
}

let mediaSourceShape = {
  type: string(),
  url: string()
}

let mediaShape = {
  alt: optional(string()),
  fromText: optional(boolean()),
  name: optional(string()),
  poster: optional(string()),
  sensitive: optional(boolean()),
  sources: optional(json([json(mediaSourceShape)])),
  type: string(),
  url: string()
}

/**
 * Sizes from the feed are only hints, so they are replaced by real sizes
 * after the image loading. `approximate` sizes are useful only for ratio.
 */
let mediaSizeShape = {
  approximate: optional(boolean()),
  bytes: optional(number()),
  height: optional(number()),
  width: optional(number())
}

let pollOptionShape = {
  title: string()
}

let pollShape = {
  options: json([json(pollOptionShape)])
}

let previewShape = {
  description: optional(string()),
  image: optional(string()),
  title: optional(string()),
  url: string()
}

/**
 * Facts for the post rendering, which need the network or are too expensive
 * to calculate on every render. `getPostBadges()` turns them into badges.
 */
let signalsShape = {
  threadPosition: optional(number()),
  threadSize: optional(number())
}

/**
 * Quotes are only one level deep, so the quote of the quoted post
 * is only a link.
 */
let quotedShape = {
  author: optional(json(authorShape)),
  full: optional(string()),
  lang: optional(string()),
  media: optional(json([json(mediaShape)])),
  mediaSizes: optional(json([optional(json(mediaSizeShape))])),
  missing: boolean(),
  poll: optional(json(pollShape)),
  preview: optional(json(previewShape)),
  publishedAt: optional(bigint()),
  quotedUrl: optional(string()),
  signals: optional(json(signalsShape)),
  title: optional(string()),
  updatedAt: optional(bigint()),
  url: optional(string()),
  warning: optional(string())
}

export type PostAuthor = CrdtJsonType<typeof authorShape>
export type PostMedia = CrdtJsonType<typeof mediaShape>
export type MediaSize = CrdtJsonType<typeof mediaSizeShape>
export type PostPoll = CrdtJsonType<typeof pollShape>
export type PostPreview = CrdtJsonType<typeof previewShape>
export type QuotedPost = CrdtJsonType<typeof quotedShape>
export type PostSignals = CrdtJsonType<typeof signalsShape>

export const postsTable = defineCrdtTable(
  'posts',
  {
    accountId: optional(string()),
    // Only when the feed is not the author, like for reposts
    author: optional(json(authorShape)),
    feedId: optional(string()),
    full: optional(string()),
    intro: optional(string()),
    lang: optional(string()),
    media: optional(json([json(mediaShape)])),
    // Separated from media to fill it after the first image loading
    mediaSizes: optional(json([optional(json(mediaSizeShape))])),
    // Thread’s parts after the first post, which readers show in its card
    merged: boolean({ default: false }),
    originId: string(),
    poll: optional(json(pollShape)),
    preview: optional(json(previewShape)),
    publishedAt: bigint(),
    quoted: optional(json(quotedShape)),
    read: boolean({ default: false }),
    reading: oneOf(READINGS, { default: 'slow' }),
    replied: optional(json(quotedShape)),
    repostedBy: optional(json(authorShape)),
    signals: optional(json(signalsShape)),
    sortedAt: bigint(),
    threadId: optional(string()),
    title: optional(string()),
    unsupported: optional(boolean()),
    // -1 for posts with the edited mark, but without the time
    updatedAt: optional(bigint()),
    url: optional(string()),
    warning: optional(string())
  },
  [
    // Pages of the feed reader and of the list reader. `id` repeats
    // the cursor of the readers to keep the pages sorted by the index
    ['feedId', 'reading', 'read', 'merged', 'sortedAt DESC', 'id DESC'],
    // The same for a category, and unread counters of the menu
    ['reading', 'read', 'merged', 'sortedAt DESC', 'id DESC'],
    // The same for posts of the account without a feed
    ['accountId', 'reading', 'read', 'merged', 'sortedAt DESC', 'id DESC'],
    // Parts of the thread
    ['feedId', 'threadId'],
    ['accountId', 'threadId'],
    // Pages of the backup export
    'publishedAt DESC'
  ]
)

export const settingsTable = defineCrdtTable('settings', {
  // Creation sets only it, since other devices could create the row too
  createdAt: optional(bigint()),
  fastPostsMaxAge: optional(number()),
  nightLock: optional(
    json({ enabled: boolean(), from: number(), to: number() })
  ),
  openWarnings: optional(boolean()),
  showSensitiveMedia: optional(boolean())
})

type AccountsSchema = typeof accountsTable.schema
type CategoriesSchema = typeof categoriesTable.schema
type FeedsSchema = typeof feedsTable.schema
type FiltersSchema = typeof filtersTable.schema
type PostsSchema = typeof postsTable.schema
type SettingsSchema = typeof settingsTable.schema

export type AccountValue = CrdtTableRow<AccountsSchema>
export type CategoryValue = CrdtTableRow<CategoriesSchema>
export type FeedValue = CrdtTableRow<FeedsSchema>
export type FilterValue = CrdtTableRow<FiltersSchema>
export type PostValue = CrdtTableRow<PostsSchema>
export type SettingsValue = CrdtTableRow<SettingsSchema>

export type NewAccount = NewCrdtRow<AccountsSchema>
export type NewCategory = NewCrdtRow<CategoriesSchema>
export type NewFeed = NewCrdtRow<FeedsSchema>
export type NewFilter = NewCrdtRow<FiltersSchema>
export type NewPost = NewCrdtRow<PostsSchema>

export type AccountChanges = Partial<CrdtRowFields<AccountsSchema>>
export type CategoryChanges = Partial<CrdtRowFields<CategoriesSchema>>
export type FeedChanges = Partial<CrdtRowFields<FeedsSchema>>
export type FilterChanges = Partial<CrdtRowFields<FiltersSchema>>
export type PostChanges = Partial<CrdtRowFields<PostsSchema>>
export type SettingsChanges = Partial<CrdtRowFields<SettingsSchema>>

export interface Tables {
  accounts: CrdtTable<AccountsSchema>
  categories: CrdtTable<CategoriesSchema>
  feeds: CrdtTable<FeedsSchema>
  filters: CrdtTable<FiltersSchema>
  posts: CrdtTable<PostsSchema>
  settings: CrdtTable<SettingsSchema>
}

let currentCrdt: CrdtDatabase | undefined
let currentTables: Tables | undefined
let currentTracker: LogTracker | undefined

/**
 * Tell that the next database will be filled from the server, not from
 * the local log. Call it on sign in to the existing account.
 */
export function markDatabaseDownloading(): void {
  downloadingCloudData.set(true)
}

/**
 * Tables of the database of the current user.
 */
export function getTables(): Tables {
  /* node:coverage ignore next 3 */
  if (!currentTables) {
    throw new Error('No Slow Reader database')
  }
  return currentTables
}

/**
 * CRDT database of the current user to subscribe to the applied actions.
 */
export function getCrdt(): CrdtDatabase {
  /* node:coverage ignore next 3 */
  if (!currentCrdt) {
    throw new Error('No Slow Reader database')
  }
  return currentCrdt
}

/**
 * Is the database still open. Sign-out closes it, so async tasks started
 * before it should stop instead of throwing.
 */
export function hasDatabase(): boolean {
  return !!currentTables
}

/**
 * Database of the current user. It is a store to re-create SQL queries
 * on sign in and sign out.
 */
export const openedDatabase = atom<Database | undefined>()

/**
 * Database of the current user for queries across few tables.
 */
export function getDatabase(): Database {
  let db = openedDatabase.get()
  /* node:coverage ignore next 3 */
  if (!db) {
    throw new Error('No Slow Reader database')
  }
  return db
}

/**
 * `crdt.ready` is resolved also when the database was stopped, for instance,
 * by sign out during the opening. Raw SQL and empty results of `load()`
 * can’t tell it from the empty tables.
 */
export function isReady(crdt: CrdtDatabase): boolean {
  return crdt === currentCrdt && crdt.status.get() === 'ready'
}

export async function getDatabaseSize(): Promise<number> {
  let rows = await getCrdt().select<{ size: number }>`
    SELECT page_count * page_size AS size
    FROM pragma_page_count(), pragma_page_size()
  `
  // The stopped database returns no rows
  return rows[0]?.size ?? 0
}

/**
 * Rewrite the whole database file to free all the space taken by deleted
 * rows. It blocks the database for the time proportional to its size,
 * so it is called only on the user’s request.
 */
export async function rebuildDatabase(): Promise<void> {
  await getCrdt().ready
  await getDatabase().exec`VACUUM`
}

/**
 * Return a limited number of the pages of deleted rows to the OS. It does not
 * rewrite the file, so it can be called after every mass deletion.
 */
export async function freeDatabasePages(): Promise<void> {
  if (!hasDatabase()) return
  await getCrdt().select`PRAGMA incremental_vacuum(1000)`
}

/**
 * Remove all rows from all tables, but keep the database working.
 *
 * Sign-out cleans the database by `Client#clean()`, which also stops it.
 * This function is for tests and visual stories, which reset the data
 * between cases and keep using the same client: the client can’t be
 * replaced in the same page, since mounted SQL stores will keep
 * the subscription to the previous database.
 */
export async function cleanDatabase(): Promise<void> {
  await currentCrdt?.empty()
}

/**
 * Actions restored from the tables to rebuild a reducer. The log keeps
 * only actions, which are not derivable from the tables. The tables are
 * read after the migration to not get them in the middle of the replay.
 */
export async function getTableActions(
  plurals: (keyof Tables)[]
): Promise<[Action, MetaTime][]> {
  let crdt = currentCrdt
  let tables = currentTables
  if (!crdt || !tables) return []
  await crdt.ready
  if (!isReady(crdt)) return []
  return crdtTableToActions(plurals.map(plural => tables[plural]))
}

export function reportDatabaseError(error: unknown): void {
  getEnvironment().warn(error)
  if (hasDatabase() && hasCloud.get()) {
    void resetDatabase('broken-db', error)
  }
}

/**
 * Send the data of the local user to the server on the sign-up. The local
 * log is empty, so the actions are generated from the tables with fresh meta.
 *
 * The account is new, so no other device can conflict with the fresh meta.
 */
async function uploadLocalData(logux: CrossTabClient): Promise<void> {
  uploadingLocalData.set(true)
  let tables = getTables()
  let actions = await crdtTableToActions([
    tables.accounts,
    tables.categories,
    tables.feeds,
    tables.filters,
    tables.posts,
    tables.settings
  ])
  if (actions.length > 0) {
    await busyDuring(
      commonMessages.get().uploadingData,
      async setProgress => {
        for (let i = 0; i < actions.length; i++) {
          if (!hasDatabase()) return
          await logux.log.add(actions[i]![0], { sync: true })
          if (i % 20 === 0) setProgress(i / actions.length)
        }
      },
      true
    )
  }
  uploadingLocalData.set(false)
}

function getDownloadingLabel(logux: CrossTabClient): string {
  let messages = commonMessages.get()
  return logux.state === 'disconnected'
    ? messages.waitingConnection
    : messages.downloadingData
}

/**
 * Show the loader after the sign in or the database reset.
 */
function showBusyUntilFilled(logux: CrossTabClient): () => void {
  let stop!: () => void
  let filled = Promise.race([
    logux.waitFor('synchronized'),
    new Promise<void>(resolve => {
      stop = resolve
    })
  ])

  void busyDuring(
    getDownloadingLabel(logux),
    async (setProgress, setLabel) => {
      let unbindLabel = logux.on('state', () => {
        setLabel(getDownloadingLabel(logux))
      })
      let unbindProgress = receivingProgress.subscribe(progress => {
        if (progress !== undefined) setProgress(progress)
      })
      try {
        await filled
      } finally {
        unbindLabel()
        unbindProgress()
      }
    },
    true
  ).then(() => {
    // The user could sign out while the data was downloading
    if (hasDatabase()) downloadingCloudData.set(false)
  })

  return stop
}

/**
 * The first start has no data to load: the time goes to creating the tables.
 */
function getOpeningLabel(crdt: CrdtDatabase): string {
  let messages = commonMessages.get()
  if (downloadingCloudData.get()) {
    return messages.downloadingData
  } else if (crdt.status.get() === 'creating') {
    return messages.creatingDatabase
  } else {
    return messages.loadingData
  }
}

function openDatabase(logux: CrossTabClient, db: Database): void {
  let store = getEnvironment().persistentStore
  db.on('error', error => {
    // Client restart closes the database under unfinished queries
    if (openedDatabase.get() === db) reportDatabaseError(error)
  })

  // The upload of the previous start was not finished, so it must be restarted.
  // Remove in the next release: the mark was `slowreader:migrating` before
  let unfinished = uploadingLocalData.get() || !!store['slowreader:migrating']
  delete store['slowreader:migrating']
  uploadingLocalData.set(false)

  // The client is re-created on every `hasCloud` change, so the mode
  // can not change during the database’s life
  let cloud = hasCloud.get()
  let crdt = createCrdtDatabase(logux, db, {
    key: 'slowreader:db',
    storage: store,
    sync: cloud,
    // The database, which hangs instead of throwing the error, never resolves
    // `crdt.ready`, so the app would wait for it forever
    timeout: 60_000
  })
  currentCrdt = crdt

  /* node:coverage ignore next 6 */
  crdt.on('migrating', done => {
    void busyDuring(commonMessages.get().migratingDatabase, () => done, true)
  })
  crdt.on('stop', () => {
    fatal.set({ type: 'outdated' })
  })
  crdt.on('corrupted', (reason, error) => {
    if (error) getEnvironment().warn(error)
    if (hasDatabase() && cloud) void resetDatabase(reason, error)
  })

  currentTables = {
    accounts: crdt.table(accountsTable),
    categories: crdt.table(categoriesTable),
    feeds: crdt.table(feedsTable),
    filters: crdt.table(filtersTable),
    posts: crdt.table(postsTable),
    settings: crdt.table(settingsTable)
  }
  // The tracker parses actions by the tables, so it is installed after them
  if (cloud) currentTracker = trackLog(logux, crdt)
  openedDatabase.set(db)

  void crdt.checked.then(() =>
    busyDuring(getOpeningLabel(crdt), () => crdt.ready)
  )

  void crdt.ready.then(async () => {
    // The user could sign out while the database was filling
    if (!isReady(crdt)) return
    // The data is already here, but the mark was not removed: for instance,
    // the app was closed during the download
    if (downloadingCloudData.get()) {
      let feeds = await getTables().feeds.load`LIMIT 1`
      if (feeds.length > 0) downloadingCloudData.set(false)
    }
    if (unfinished) return uploadLocalData(logux)
  })
}

/**
 * The client is destroyed here and not in `client.ts`, since its log store
 * shares the database and must finish the writes before the closing.
 */
function closeDatabase(logux: CrossTabClient): void {
  let closingDb = openedDatabase.get()
  let destroying = currentCrdt?.destroy()
  currentTracker?.destroy()
  let tracking = currentTracker?.finish()

  currentCrdt = undefined
  currentTables = undefined
  currentTracker = undefined
  openedDatabase.set(undefined)

  void Promise.all([destroying, tracking])
    .then(() => logux.destroy())
    .then(() => closingDb?.close())
}

onClient(logux => {
  openDatabase(logux, database.get()!)
  // Detecting resetting database from other browser tabs
  let unbindDownloading = effect(downloadingCloudData, downloading => {
    if (downloading) return showBusyUntilFilled(logux)
  })
  return () => {
    unbindDownloading()
    closeDatabase(logux)
  }
})
