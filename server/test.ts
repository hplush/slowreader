import { PostgresStore, TestServer } from '@logux/server'
import { PgTable } from 'drizzle-orm/pg-core'

import { db, dbDriver } from './db/index.ts'
import * as tables from './db/schema.ts'
import type { ClientData } from './lib/types.ts'
import authModule from './modules/auth.ts'
import healthModule from './modules/health.ts'
import passwordsModule from './modules/passwords.ts'
import syncModule from './modules/sync.ts'
import usersModule from './modules/users.ts'

let store = new PostgresStore(dbDriver)
await store.init()

export async function cleanSessions(): Promise<void> {
  await db.delete(tables.sessions)
}

export async function cleanAllTables(): Promise<void> {
  await Promise.all([
    store.clean(),
    ...Object.values(tables).map(async table => {
      if (table instanceof PgTable) {
        await db.delete(table)
      }
    })
  ])
}

export async function getServerLogIds(): Promise<string[]> {
  let sql = `SELECT "id" FROM "logux_log" ORDER BY "added"`
  let rows =
    'unsafe' in dbDriver
      ? await dbDriver.unsafe(sql)
      : (await dbDriver.query<{ id: string }>(sql)).rows
  return rows.map(row => String(row.id))
}

export function buildTestServer(): TestServer<object, ClientData> {
  let server = new TestServer<object, ClientData>({ store })
  authModule(server)
  healthModule(server)
  usersModule(server)
  passwordsModule(server)
  syncModule(server)
  return server
}
