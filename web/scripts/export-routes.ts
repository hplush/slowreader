// Export application router regexps to json file

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { pathRouter as router } from '../stores/router.js'

let routerRegexes = router.routes.map(route => ({
  flags: route[1].flags,
  source: route[1].source
}))

let routesFilePath = join(import.meta.dirname, '../.nginx/routes.js')

writeFileSync(
  routesFilePath,
  `export default ${JSON.stringify(routerRegexes, null, 2)}`
)
