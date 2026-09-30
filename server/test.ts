import { PostgresStore, TestServer } from '@logux/server'
import { PgTable } from 'drizzle-orm/pg-core'

import { downloadProvidersIfMissed, loadProviders } from './aaguids/utils.ts'
import { db, dbDriver } from './db/index.ts'
import * as tables from './db/schema.ts'
import { resetLimits } from './lib/limits.ts'
import type { ClientData } from './lib/types.ts'
import authModule from './modules/auth.ts'
import healthModule from './modules/health.ts'
import passkeysModule from './modules/passkeys.ts'
import sessionsModule from './modules/sessions.ts'
import syncModule from './modules/sync.ts'
import usersModule from './modules/users.ts'

export { FakeAuthenticator } from './test/authenticator.ts'

await downloadProvidersIfMissed()
await loadProviders()

let store = new PostgresStore(dbDriver)
await store.init()

export async function cleanSessions(): Promise<void> {
  await db.delete(tables.sessions)
}

export async function cleanAllTables(): Promise<void> {
  resetLimits()
  await Promise.all([
    store.clean(),
    ...Object.values(tables).map(async table => {
      if (table instanceof PgTable && table !== tables.users) {
        await db.delete(table)
      }
    })
  ])
  await db.delete(tables.users)
}

export async function getServerLogIds(): Promise<string[]> {
  let sql = `SELECT "id" FROM "logux_log" ORDER BY "added"`
  let rows =
    'unsafe' in dbDriver
      ? await dbDriver.unsafe(sql)
      : (await dbDriver.query<{ id: string }>(sql)).rows
  return rows.map(row => String(row.id))
}

function destroyable<Some extends TestServer>(
  server: Some
): AsyncDisposable & Some {
  return Object.assign(server, {
    async [Symbol.asyncDispose]() {
      await server.destroy()
    }
  })
}

export function emptyTestServer(): AsyncDisposable & TestServer {
  return destroyable(new TestServer())
}

export function buildTestServer(
  opts: ConstructorParameters<typeof TestServer>[0] = {}
): AsyncDisposable & TestServer<object, ClientData> {
  let server = new TestServer<object, ClientData>({ store, ...opts })
  authModule(server)
  healthModule(server)
  usersModule(server)
  passkeysModule(server)
  sessionsModule(server)
  syncModule(server)
  return destroyable(server)
}
