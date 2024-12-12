import { PGlite } from '@electric-sql/pglite'
import type { MigrationConfig } from 'drizzle-orm/migrator'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as devDrizzle } from 'drizzle-orm/pglite'
import { migrate as devMigrate } from 'drizzle-orm/pglite/migrator'
import { drizzle as prodDrizzle } from 'drizzle-orm/postgres-js'
import { migrate as prodMigrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'node:path'
import postgres from 'postgres'

import { config } from '../lib/config.ts'
import * as schema from './schema.ts'
export * from './schema.ts'

const MIGRATE_CONFIG: MigrationConfig = {
  migrationsFolder: join(import.meta.dirname, 'migrations')
}

let drizzle: PgDatabase<PgQueryResultHKT, typeof schema>
if (config.db.startsWith('memory:') || config.db.startsWith('file:')) {
  let pglite = new PGlite(config.db)
  let drizzlePglite = devDrizzle(pglite, { schema })
  await devMigrate(drizzlePglite, MIGRATE_CONFIG)
  drizzle = drizzlePglite
} else {
  /* c8 ignore next 5 */
  drizzle = prodDrizzle(postgres(config.db), { schema })
  let migrateConnection = postgres(config.db, { max: 1 })
  await prodMigrate(prodDrizzle(migrateConnection), MIGRATE_CONFIG)
  await migrateConnection.end()
}

export const db = drizzle
