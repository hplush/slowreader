import { PGlite } from '@electric-sql/pglite'
import { defineRelations } from 'drizzle-orm'
import type { MigrationConfig } from 'drizzle-orm/migrator'
import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite'
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator'
import { drizzle as postgresDrizzle } from 'drizzle-orm/postgres-js'
import { migrate as postgresMigrate } from 'drizzle-orm/postgres-js/migrator'
import { access, constants, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import postgres from 'postgres'

import { config } from '../lib/config.ts'
import { onExit } from '../lib/exit.ts'
import * as schema from './schema.ts'
export * from './schema.ts'

const MIGRATE_CONFIG: MigrationConfig = {
  migrationsFolder: join(import.meta.dirname, 'migrations')
}

let relations = defineRelations(schema)

if (config.db.startsWith('file://')) {
  let path = config.db.slice('file://'.length)
  await mkdir(path, { recursive: true })
  await access(path, constants.R_OK | constants.W_OK)
}

export const dbDriver =
  config.db.startsWith('memory://') || config.db.startsWith('file://')
    ? new PGlite(config.db, { debug: config.debug ? 5 : undefined })
    : postgres(config.db)

export const db: PgAsyncDatabase<PgQueryResultHKT, typeof relations> =
  dbDriver instanceof PGlite
    ? pgliteDrizzle({ client: dbDriver, relations })
    : postgresDrizzle({ client: dbDriver, relations })

if (dbDriver instanceof PGlite) {
  onExit(() => {
    void dbDriver.close()
  })
  await pgliteMigrate(pgliteDrizzle({ client: dbDriver }), MIGRATE_CONFIG)
} else {
  let migrator = postgres(config.db, { max: 1 })
  await postgresMigrate(postgresDrizzle({ client: migrator }), MIGRATE_CONFIG)
  await migrator.end()
}
