// Config to drizzle-kit CLI

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: './db/pgdata'
  },
  dialect: 'postgresql',
  driver: 'pglite',
  out: './db/migrations',
  schema: './db/schema.ts'
})
