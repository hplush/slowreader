// Save web client pages for server to return HTML on GET request to this routes

// eslint-disable

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { pathRouter } from '../stores/router.js'

const ROUTES = join(import.meta.dirname, '../routes.regexp')

const FIXES: Record<string, string> = {
  '^\\/feeds\\/add(?:\\/([^/]+))?$': '^/feeds/add(/|$)'
}

function removeNamingGroup(regexp: string): string {
  return regexp.replace(/\(\?<(\w+?)>\(\?<=\\\/\)/g, '(')
}

function fixRegexp(regexp: string): string {
  return FIXES[regexp] || regexp
}

writeFileSync(
  ROUTES,
  pathRouter.routes
    .map(([, regexp]) => fixRegexp(removeNamingGroup(regexp.source)))
    .join('|')
)
