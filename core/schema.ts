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
  number,
  oneOf,
  optional,
  string
} from '@logux/client/db'
import type { Database, SqlParam } from '@nanostores/sql'
import { atom } from 'nanostores'

import { busyDuring } from './busy.ts'
import { client, database, isOutdatedClient } from './client.ts'
import { onEnvironment } from './environment.ts'
import type { LoaderName } from './loader/index.ts'
import { commonMessages } from './messages/index.ts'
import type { UsefulReaderName } from './readers/common.ts'

/**
 * ID of the virtual category for feeds without a category. Two underscores
 * to not be taken by a user’s category, which has a random ID.
 */
export const GENERAL_CATEGORY = '__general'

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

let currentCrdt: CrdtDatabase | undefined
let currentTables: Tables | undefined
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
  if (!openedDatabase.get()) return
  await ready
  await Promise.all([
    getDatabase().exec`DELETE FROM "categories"`,
    getDatabase().exec`DELETE FROM "feeds"`,
    getDatabase().exec`DELETE FROM "filters"`,
    getDatabase().exec`DELETE FROM "posts"`
  ])
}

function openDatabase(logux: CrossTabClient, db: Database): void {
  let crdt = createCrdtDatabase(logux, db, {
    key: 'slowreader:db',
    /* node:coverage ignore next 3 */
    migrating(done) {
      void busyDuring(commonMessages.get().migratingDatabase, () => done)
    },
    /* node:coverage ignore next 3 */
    stop() {
      isOutdatedClient.set(true)
    }
  })
  currentCrdt = crdt
  currentTables = {
    categories: crdt.table('categories', categoriesSchema),
    feeds: crdt.table('feeds', feedsSchema),
    filters: crdt.table('filters', filtersSchema),
    posts: crdt.table('posts', postsSchema)
  }
  ready = crdt.ready
  openedDatabase.set(db)

  void busyDuring(
    downloading
      ? commonMessages.get().downloadingData
      : commonMessages.get().loadingData,
    () => ready
  )
  downloading = false
}

function closeDatabase(): void {
  let closingDb = openedDatabase.get()
  if (!closingDb) return
  currentCrdt!.destroy()

  currentCrdt = undefined
  currentTables = undefined
  openedDatabase.set(undefined)

  let filling = ready
  ready = Promise.resolve()
  void filling.then(() => {
    setTimeout(() => {
      void closingDb.close()
    })
  })
}

onEnvironment(() => {
  let unbind = client.subscribe(logux => {
    closeDatabase()
    let db = database.get()
    if (logux && db) openDatabase(logux, db)
  })
  return () => {
    unbind()
    closeDatabase()
  }
})
