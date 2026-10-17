// Save web client pages for server to return HTML on GET request to this routes

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { getAppRoutes } from '../stores/url-router.ts'

writeFileSync(
  join(import.meta.dirname, '../routes.regexp'),
  getAppRoutes().source
)
