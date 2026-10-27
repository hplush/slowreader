// Config to drizzle-kit CLI

import { defineConfig } from 'drizzle-kit'
import { join } from 'node:path'

export default defineConfig({
  dbCredentials: {
    url: join(import.meta.dirname, 'db/pgdata')
  },
  dialect: 'postgresql',
  driver: 'pglite',
  out: './db/migrations',
  schema: './db/schema.ts'
})
