import { PGlite } from '@electric-sql/pglite'
import type { MigrationConfig } from 'drizzle-orm/migrator'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle as devDrizzle } from 'drizzle-orm/pglite'
import { migrate as devMigrate } from 'drizzle-orm/pglite/migrator'
import { drizzle as prodDrizzle } from 'drizzle-orm/postgres-js'
import { migrate as prodMigrate } from 'drizzle-orm/postgres-js/migrator'
import { existsSync } from 'node:fs'
import { access, constants, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

import { config } from '../lib/config.ts'
import { onExit } from '../lib/exit.ts'
import * as schema from './schema.ts'
export * from './schema.ts'

const MIGRATE_CONFIG: MigrationConfig = {
  migrationsFolder: join(import.meta.dirname, 'migrations')
}

export let dumpDb = (): Promise<void> => Promise.resolve()

let drizzle: PgDatabase<PgQueryResultHKT, typeof schema>
if (
  config.db.startsWith('memory://') ||
  config.db.startsWith('file://') ||
  config.db.startsWith('dump:')
) {
  let pglite: PGlite
  if (config.db.startsWith('dump:')) {
    let path = config.db.slice(5)
    await mkdir(dirname(path), { recursive: true })
    if (existsSync(path)) {
      let dump = await readFile(path)
      pglite = new PGlite({
        loadDataDir: new Blob([dump], { type: 'application/x-tar' })
      })
    } else {
      pglite = new PGlite()
    }
    dumpDb = async () => {
      let blob = await pglite.dumpDataDir('none')
      await writeFile(path, Buffer.from(await blob.arrayBuffer()), {
        encoding: 'binary'
      })
    }
    onExit(() => {
      dumpDb()
    })
    setInterval(dumpDb, 60 * 60 * 1000)
  } else {
    if (config.db.startsWith('file://')) {
      let path = config.db.slice(7)
      await mkdir(path, { recursive: true })
      await access(path, constants.R_OK | constants.W_OK)

      onExit(() => {
        pglite.close()
      })
    }
    pglite = new PGlite(config.db)
  }
  let drizzlePglite = devDrizzle(pglite, { schema })
  await devMigrate(drizzlePglite, MIGRATE_CONFIG)
  drizzle = drizzlePglite
} else {
  drizzle = prodDrizzle(postgres(config.db), { schema })
  let migrateConnection = postgres(config.db, { max: 1 })
  await prodMigrate(prodDrizzle(migrateConnection), MIGRATE_CONFIG)
  await migrateConnection.end()
}

export const db = drizzle
