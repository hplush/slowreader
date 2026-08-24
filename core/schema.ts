// Single place with all database tables. Every table is a CRDT LWW map
// on top of SQL database, which is filled by actions from Logux log.

import {
  type ActionCreator,
  type CrdtTableChangedAction,
  type CrdtTableCreatedAction,
  type CrdtTableDeletedAction,
  defineAction
} from '@logux/actions'
import type { CrossTabClient } from '@logux/client'
import {
  bigint,
  type CrdtCreateFields,
  type CrdtDatabase,
  type NewCrdtRow,
  type CrdtRowFields,
  type CrdtTable,
  type CrdtTableRow,
  type CrdtTableSchema,
  createCrdtDatabase,
  crdtTableToActions,
  number,
  oneOf,
  optional,
  string
} from '@logux/client/db'
import type { Action, MetaTime } from '@logux/core'
import type { Database, SqlParam } from '@nanostores/sql'
import { atom } from 'nanostores'

import { busyDuring } from './busy.ts'
import {
  database,
  isOutdatedClient,
  onClient,
  resetDatabase
} from './client.ts'
import { getEnvironment } from './environment.ts'
import { subscribeUntil } from './lib/stores.ts'
import type { LoaderName } from './loader/index.ts'
import { type LogTracker, trackLog } from './log.ts'
import { commonMessages } from './messages/index.ts'
import type { UsefulReaderName } from './readers/common.ts'
import { hasPassword, uploadingLocalData } from './settings.ts'

/**
 * ID of the virtual category for feeds without a category. Two underscores
 * to not be taken by a user’s category, which has a random ID.
 */
export const GENERAL_CATEGORY = '__general'

/**
 * The key keeps the hash of the tables’ schema, so its absence means
 * that the tables were not created yet.
 */
const DB_KEY = 'slowreader:db'

const READERS = ['feed', 'list'] as const satisfies readonly UsefulReaderName[]

const READINGS = ['fast', 'slow'] as const

let categoriesSchema = {
  fastReader: optional(oneOf(READERS)),
  slowReader: optional(oneOf(READERS)),
  title: string()
}

let feedsSchema = {
  categoryId: string({ default: GENERAL_CATEGORY }),
  fastReader: optional(oneOf(READERS)),
  lastOriginId: optional(string()),
  lastPublishedAt: optional(bigint()),
  loader: string<LoaderName>(),
  reading: oneOf(READINGS),
  refreshedAt: optional(bigint()),
  slowReader: optional(oneOf(READERS)),
  title: string(),
  url: string()
}

let filtersSchema = {
  action: oneOf(['delete', 'fast', 'slow']),
  feedId: string(),
  priority: number(),
  query: string()
}

let postsSchema = {
  feedId: string(),
  full: optional(string()),
  intro: optional(string()),
  media: optional(string()),
  originId: string(),
  publishedAt: bigint(),
  // SQLite has no boolean, so we are using 0 and 1
  read: number({ default: 0 }),
  reading: oneOf(READINGS),
  title: optional(string()),
  url: optional(string())
}

export type CategoryValue = CrdtTableRow<typeof categoriesSchema>
export type FeedValue = CrdtTableRow<typeof feedsSchema>
export type FilterValue = CrdtTableRow<typeof filtersSchema>
export type PostValue = CrdtTableRow<typeof postsSchema>

export type NewCategory = NewCrdtRow<typeof categoriesSchema>
export type NewFeed = NewCrdtRow<typeof feedsSchema>
export type NewFilter = NewCrdtRow<typeof filtersSchema>
export type NewPost = NewCrdtRow<typeof postsSchema>

export type CategoryChanges = Partial<CrdtRowFields<typeof categoriesSchema>>
export type FeedChanges = Partial<CrdtRowFields<typeof feedsSchema>>
export type FilterChanges = Partial<CrdtRowFields<typeof filtersSchema>>
export type PostChanges = Partial<CrdtRowFields<typeof postsSchema>>

export interface Tables {
  categories: CrdtTable<typeof categoriesSchema>
  feeds: CrdtTable<typeof feedsSchema>
  filters: CrdtTable<typeof filtersSchema>
  posts: CrdtTable<typeof postsSchema>
}

type TableActions<Schema extends CrdtTableSchema> = [
  created: ActionCreator<CrdtTableCreatedAction<CrdtCreateFields<Schema>>>,
  changed: ActionCreator<CrdtTableChangedAction<CrdtRowFields<Schema>>>,
  deleted: ActionCreator<CrdtTableDeletedAction>
]

function crdtActions<Schema extends CrdtTableSchema>(
  plural: string
): TableActions<Schema> {
  return [
    defineAction(`${plural}/created`),
    defineAction(`${plural}/changed`),
    defineAction(`${plural}/deleted`)
  ]
}

export const tableActions = {
  categories: crdtActions<typeof categoriesSchema>('categories'),
  feeds: crdtActions<typeof feedsSchema>('feeds'),
  filters: crdtActions<typeof filtersSchema>('filters'),
  posts: crdtActions<typeof postsSchema>('posts')
}

/**
 * Actions restored from the tables. They are the same for the database
 * migration and for the menu reducer, so they are generated once per boot.
 */
export type TableSnapshot = [Action, MetaTime][]

let currentCrdt: CrdtDatabase | undefined
let currentTables: Tables | undefined
let currentTracker: LogTracker | undefined
let snapshot: Promise<TableSnapshot> | undefined
let ready: Promise<void> = Promise.resolve()
let downloading = false

/**
 * Tell that the next database will be filled from the server, not from
 * the local log. Call it on sign in to the existing account.
 */
export function markDatabaseDownloading(): void {
  downloading = true
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
 * One-time SQL query, which waits for tables to be filled from Logux log.
 */
export function select<Row>(
  sql: TemplateStringsArray,
  ...params: SqlParam[]
): Promise<Row[]> {
  return ready.then(() => getDatabase().select<Row>(sql, ...params))
}

export async function getDatabaseSize(): Promise<number> {
  let rows = await select<{ size: number }>`
    SELECT page_count * page_size AS size
    FROM pragma_page_count(), pragma_page_size()
  `
  return rows[0]!.size
}

/**
 * Rewrite the whole database file to free all the space taken by deleted
 * rows. It blocks the database for the time proportional to its size,
 * so it is called only on the user’s request.
 */
export async function rebuildDatabase(): Promise<void> {
  await ready
  await getDatabase().exec`VACUUM`
}

/**
 * Return a limited number of the pages of deleted rows to the OS. It does not
 * rewrite the file, so it can be called after every mass deletion.
 */
export async function freeDatabasePages(): Promise<void> {
  await ready
  if (!hasDatabase()) return
  await getDatabase().select`PRAGMA incremental_vacuum(1000)`
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
 * The log keeps only actions, which are not derivable from the tables,
 * so the migration replay must restore the rest from the tables themselves.
 */
function getSnapshot(): Promise<TableSnapshot> {
  let tables = getTables()
  snapshot ??= crdtTableToActions([
    tables.categories,
    tables.feeds,
    tables.filters,
    tables.posts
  ])
  return snapshot
}

/**
 * Actions restored from the tables to rebuild a reducer. The reducer can ask
 * only for the tables it needs, but the snapshot of the database migration
 * is reused if the tables are being replayed right now.
 */
export async function getTableActions(
  plurals: (keyof Tables)[]
): Promise<TableSnapshot> {
  await whenSchemaChecked()
  let tables = getTables()
  if (snapshot) {
    let all = await snapshot
    return all.filter(entry => {
      return plurals.some(plural => entry[0].type.startsWith(`${plural}/`))
    })
  }
  return crdtTableToActions(plurals.map(plural => tables[plural]))
}

/**
 * The database compares the schema version before it drops the tables,
 * so the reducer must wait for the comparison to not read the tables
 * in the middle of the replay.
 */
function whenSchemaChecked(): Promise<void> {
  let status = currentCrdt!.status
  if (status.get() !== 'initializing') return Promise.resolve()
  return new Promise(resolve => {
    subscribeUntil(status, value => {
      if (value === 'initializing') return false
      resolve()
      return true
    })
  })
}

export function reportDatabaseError(error: unknown): void {
  getEnvironment().warn(error)
  if (hasDatabase() && hasPassword.get()) {
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
  let actions = await getSnapshot()
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

/**
 * The first start has no data to load: the time goes to creating the tables.
 */
function getOpeningLabel(hasTables: boolean): string {
  let messages = commonMessages.get()
  if (downloading) {
    return messages.downloadingData
  } else if (hasTables) {
    return messages.loadingData
  } else {
    return messages.creatingDatabase
  }
}

function openDatabase(logux: CrossTabClient, db: Database): void {
  let store = getEnvironment().persistentStore
  db.on('error', reportDatabaseError)

  // The upload of the previous start was not finished, so it must be restarted.
  // Remove in the next release: the mark was `slowreader:migrating` before
  let unfinished = uploadingLocalData.get() || !!store['slowreader:migrating']
  delete store['slowreader:migrating']
  uploadingLocalData.set(false)

  let hasTables = !!store[DB_KEY]

  // The client is re-created on every `hasPassword` change, so the mode
  // can not change during the database’s life
  let cloud = hasPassword.get()
  let crdt = createCrdtDatabase(logux, db, {
    key: DB_KEY,
    repeat: getSnapshot,
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
    isOutdatedClient.set(true)
  })
  crdt.on('corrupted', (reason, error) => {
    if (error) getEnvironment().warn(error)
    if (hasDatabase() && cloud) void resetDatabase(reason, error)
  })

  currentTables = {
    categories: crdt.table('categories', categoriesSchema, ['title']),
    feeds: crdt.table('feeds', feedsSchema, [
      // Category reader and feeds list
      ['categoryId', 'title'],
      // Duplicate check on adding a feed and on OPML import
      'url',
      'title'
    ]),
    filters: crdt.table('filters', filtersSchema, [
      // Filters of the feed in their order
      ['feedId', 'priority']
    ]),
    posts: crdt.table('posts', postsSchema, [
      // Pages of the feed reader and of the list reader. `id` repeats
      // the cursor of the readers to keep the pages sorted by the index
      ['feedId', 'reading', 'read', 'publishedAt DESC', 'id DESC'],
      // The same for a category, and unread counters of the menu
      ['reading', 'read', 'publishedAt DESC', 'id DESC'],
      // Pages of the backup export
      'publishedAt DESC'
    ])
  }
  // The tracker parses actions by the tables, so it is installed after them
  if (cloud) currentTracker = trackLog(logux, crdt)
  ready = crdt.ready
  openedDatabase.set(db)

  void busyDuring(getOpeningLabel(hasTables), () => ready)
  downloading = false

  void ready.then(() => {
    // The user could sign out while the database was filling
    if (!hasDatabase()) return
    if (unfinished) return uploadLocalData(logux)
  })
}

function closeDatabase(): void {
  let closingDb = openedDatabase.get()
  if (!closingDb) return
  currentCrdt!.destroy()
  currentTracker?.destroy()
  let tracking = currentTracker?.finish()

  currentCrdt = undefined
  currentTables = undefined
  currentTracker = undefined
  snapshot = undefined
  openedDatabase.set(undefined)

  let filling = ready
  ready = Promise.resolve()
  void Promise.all([filling, tracking]).then(() => {
    setTimeout(() => {
      void closingDb.close()
    })
  })
}

onClient(logux => {
  openDatabase(logux, database.get()!)
  return closeDatabase
})
