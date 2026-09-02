// Script to build the database and the settings for the demo mode.

import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import {
  changeFeed,
  currentPage,
  generateCredentials,
  getDatabase,
  type ImportPage,
  loadCategories,
  loadFeedsByCategory,
  moveLastSyncedToPast,
  refreshPosts,
  select,
  setupEnvironment,
  useCredentials
} from '@slowreader/core'
import { setNodeRequestMethod, setupNodeDom } from '@slowreader/core/node'
import {
  getTestEnvironment,
  setBaseTestRoute,
  setWarningTracking
} from '@slowreader/core/test'
import { createHash } from 'node:crypto'
import { readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { error, finish, success } from '../../scripts/progress.ts'

const OPML = join(import.meta.dirname, 'demo-feeds.opml')
const PUBLIC = join(import.meta.dirname, '..', 'public')
const DATABASE = join(PUBLIC, 'demo.sqlite')
const MANIFEST = join(PUBLIC, 'demo.json')

/**
 * Categories to show in the fast mode. The rest goes to the slow mode.
 */
const FAST = ['Comics', 'Photo', 'Short Facts']

/**
 * How deep to load the feeds’ history. Feeds publish only their latest
 * posts, so a bigger number does not always mean more posts: it only tells
 * the refresh when to stop, and drops the feeds which were quiet for longer.
 */
const DAYS = 30

setupNodeDom()

let warnings: unknown[] = []
setWarningTracking(warnings)

rmSync(DATABASE, { force: true })

let environment = getTestEnvironment()
setupEnvironment({
  ...environment,
  databaseCreator: () => openDb(nodeDriver(DATABASE)),
  server: 'NO_SERVER'
})
let storage = environment.persistentStore

setNodeRequestMethod()

useCredentials(generateCredentials())

currentPage.listen(() => {})
setBaseTestRoute({ params: {}, route: 'import' })
let opened = currentPage.get()
if (opened.route !== 'import') {
  error(new Error(`Opened ${opened.route} instead of the import page`))
  finish('Demo database was not built')
}
let page = opened as ImportPage

let opml = readFileSync(OPML, 'utf8')
await page.importFile(
  new File([opml], 'demo.opml', { type: 'application/xml' })
)
for (let [url, reason] of page.feedErrors.get()) {
  error(new Error(`Failed to import ${url}: ${reason}`))
}
success(`Imported ${page.done.get()} feeds`)

for (let category of await loadCategories()) {
  if (!FAST.includes(category.title)) continue
  let feeds = await loadFeedsByCategory(category.id)
  await changeFeed(
    feeds.map(feed => feed.id),
    { reading: 'fast' }
  )
  success(`${category.title} is fast`, `${feeds.length} feeds`)
}

await moveLastSyncedToPast(DAYS)
await refreshPosts()
for (let warned of warnings) error(warned)
let [posts] = await select<{ count: number }>`SELECT count(*) AS count
                                              FROM posts`
success(`Loaded ${posts!.count} posts`, `for the last ${DAYS} days`)

await getDatabase().close()

let bytes = readFileSync(DATABASE)
// `OpfsDb.importDb()` in the browser rejects a file, which is not a whole
// number of SQLite pages
if (bytes.length % 512 !== 0) {
  error(new Error(`Database size ${bytes.length} is not a multiple of 512`))
}
// The header’s write and read format bytes are 2 in WAL mode, where a part
// of the data lives in a separate file, which the browser will not get
if (bytes[18] !== 1 || bytes[19] !== 1) {
  error(new Error('Database is in WAL mode and is not a single file'))
}

writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      // `slowreader:menu` caches the IDs, which this database generated, so
      // the settings work only with the database built together with them
      database: {
        file: 'demo.sqlite',
        sha256: createHash('sha256').update(bytes).digest('hex'),
        size: bytes.length
      },
      storage
    },
    null,
    2
  )
)
success('Wrote public/demo.sqlite', `${Math.round(bytes.length / 1024)} KB`)
success('Wrote public/demo.json', `${statSync(MANIFEST).size} B`)

finish('Demo database is ready')
