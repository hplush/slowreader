import { PGlite } from '@electric-sql/pglite'
import type { MigrationConfig } from 'drizzle-orm/migrator'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as devDrizzle } from 'drizzle-orm/pglite'
import { migrate as devMigrate } from 'drizzle-orm/pglite/migrator'
import { drizzle as prodDrizzle } from 'drizzle-orm/postgres-js'
import { migrate as prodMigrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'node:path'
import postgres from 'postgres'

import * as schema from './db/schema.ts'
import { env } from './env.ts'
export * from './db/schema.ts'

const MIGRATE_CONFIG: MigrationConfig = {
  migrationsFolder: join(import.meta.dirname, 'migrations')
}

let drizzle: PgDatabase<PgQueryResultHKT, typeof schema>
if (env.NODE_ENV === 'production') {
  drizzle = prodDrizzle(postgres(env.DATABASE_URL), { schema })
  let migrateConnection = postgres(env.DATABASE_URL, { max: 1 })
  await prodMigrate(prodDrizzle(migrateConnection), MIGRATE_CONFIG)
  await migrateConnection.end()
} else {
  let drizzlePglite = devDrizzle(
    new PGlite(process.env.NODE_ENV === 'test' ? 'memory://' : './db/pgdata'),
    { schema }
  )
  await devMigrate(drizzlePglite, MIGRATE_CONFIG)
  drizzle = drizzlePglite
}

export const db = drizzle
