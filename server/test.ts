import { TestServer } from '@logux/server'
import { PgTable } from 'drizzle-orm/pg-core'

import { db } from './db/index.ts'
import * as tables from './db/schema.ts'
import addedModule from './modules/added.ts'
import authModule from './modules/auth.ts'
import healthModule from './modules/health.ts'
import passwordsModule from './modules/passwords.ts'
import syncModule from './modules/sync.ts'
import usersModule from './modules/users.ts'

export async function cleanSessions(): Promise<void> {
  await db.delete(tables.sessions)
}

export async function cleanAllTables(): Promise<void> {
  await Promise.all(
    Object.values(tables).map(async table => {
      if (table instanceof PgTable) {
        await db.delete(table)
      }
    })
  )
}

export function buildTestServer(): TestServer {
  let server = new TestServer()
  addedModule(server)
  authModule(server)
  healthModule(server)
  usersModule(server)
  passwordsModule(server)
  syncModule(server)
  return server
}
