import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  out: './db/migrations',
  schema: './db/schema.ts'
})
