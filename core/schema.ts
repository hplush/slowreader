// Single place with all database tables. Every table is a CRDT LWW map
// on top of SQL database, which is filled by actions from Logux log.

import type { CrossTabClient } from '@logux/client'
import {
  bigint,
  type CrdtCreateFields,
  type CrdtDatabase,
  type CrdtRowFields,
  type CrdtTable,
  type CrdtTableRow,
  type CrdtTableSchema,
  createCrdtDatabase,
  number,
  oneOf,
  optional,
  string,
  type WithoutMeta
} from '@logux/client/db'
import type { Database, SqlParam } from '@nanostores/sql'

import { busyDuring } from './busy.ts'
import { client, database, isOutdatedClient } from './client.ts'
import { onEnvironment } from './environment.ts'
import type { LoaderName } from './loader/index.ts'
import { commonMessages } from './messages/index.ts'
import type { UsefulReaderName } from './readers/common.ts'

const READERS = ['feed', 'list'] as const satisfies readonly UsefulReaderName[]

const READINGS = ['fast', 'slow'] as const

let categoriesSchema = {
  fastReader: optional(oneOf(READERS)),
  slowReader: optional(oneOf(READERS)),
  title: string()
}

let feedsSchema = {
  categoryId: string({ default: 'general' }),
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

/**
 * Unlike table’s own type it takes `null` in optional fields.
 */
export type NewRow<Schema extends CrdtTableSchema> = {
  [Key in keyof CrdtCreateFields<Schema>]: undefined extends CrdtCreateFields<Schema>[Key]
    ? CrdtCreateFields<Schema>[Key] | null
    : CrdtCreateFields<Schema>[Key]
} & { id?: string }

export type NewCategory = NewRow<typeof categoriesSchema>
export type NewFeed = NewRow<typeof feedsSchema>
export type NewFilter = NewRow<typeof filtersSchema>
export type NewPost = NewRow<typeof postsSchema>

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

export function createRow<Schema extends CrdtTableSchema>(
  table: CrdtTable<Schema>,
  fields: NewRow<Schema>
): Promise<string> {
  return table.create(fields as { id?: string } & CrdtCreateFields<Schema>)
}

/**
 * Add empty conflict resolution data to a row built in tests.
 */
export function withMeta<Value>(row: WithoutMeta<Value>): Value {
  let meta: Record<string, null> = {}
  for (let key of Object.keys(row)) {
    if (key !== 'id') meta[`updatedAt_${key}`] = null
  }
  return { ...row, ...meta } as Value
}

let currentCrdt: CrdtDatabase | undefined
let currentDatabase: Database | undefined
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
 * Database of the current user for queries across few tables.
 */
export function getDatabase(): Database {
  /* node:coverage ignore next 3 */
  if (!currentDatabase) {
    throw new Error('No Slow Reader database')
  }
  return currentDatabase
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
  if (!currentDatabase) return
  await ready
  await Promise.all([
    getDatabase().exec`DELETE FROM "categories"`,
    getDatabase().exec`DELETE FROM "feeds"`,
    getDatabase().exec`DELETE FROM "filters"`,
    getDatabase().exec`DELETE FROM "posts"`
  ])
}

function openDatabase(logux: CrossTabClient, db: Database): void {
  currentDatabase = db
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

  void busyDuring(
    downloading
      ? commonMessages.get().downloadingData
      : commonMessages.get().loadingData,
    () => ready
  )
  downloading = false
}

function closeDatabase(): void {
  if (!currentDatabase) return
  let closingDb = currentDatabase
  currentCrdt!.destroy()

  currentCrdt = undefined
  currentDatabase = undefined
  currentTables = undefined

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
