// Save web client pages for server to return HTML on GET request to this routes

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { pathRouter } from '../stores/router.js'

const ROUTES = join(import.meta.dirname, '../routes.regexp')

function removeNamingGroup(regexp: string): string {
  return regexp.replace(/\(\?<(\w+?)>/g, '(')
}

writeFileSync(
  ROUTES,
  '(' +
    pathRouter.routes
      .map(([, regexp]) => removeNamingGroup(regexp.source))
      .join('|') +
    ')'
)
