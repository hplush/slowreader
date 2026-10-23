// Script to build the database and the settings for the demo mode.

import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import {
  addCandidate,
  addCategory,
  cacheMediaReading,
  changeFeed,
  createDownloadTask,
  currentPage,
  deleteFeed,
  errorToMessage,
  generateCredentials,
  getCrdt,
  getDatabase,
  getLoaderForText,
  type ImportPage,
  isDemo,
  isRemoteError,
  loadCategories,
  loadFeedByUrl,
  loadFeedsByCategory,
  moveLastSyncedToPast,
  refreshErrors,
  refreshPosts,
  refreshStatistics,
  setProxyAsRequestMethod,
  setupEnvironment,
  startLocalUser
} from '@slowreader/core'
import { setupNodeDom } from '@slowreader/core/node'
import {
  getTestEnvironment,
  openRoute,
  setWarningTracking
} from '@slowreader/core/test'
import { createHash } from 'node:crypto'
import { readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  error,
  finish,
  printAboveProgress,
  setProgress,
  startProgress,
  success,
  warning
} from '../../scripts/progress.ts'

const OPML = join(import.meta.dirname, 'demo-feeds.opml')
const SOURCES = join(import.meta.dirname, 'demo-sources.json')
const PUBLIC = join(import.meta.dirname, '..', 'public')
const DATABASE = join(PUBLIC, 'demo.sqlite')
const MANIFEST = join(PUBLIC, 'demo.json')

/**
 * Categories to show in the fast mode. The rest goes to the slow mode.
 */
const FAST = ['Comics', 'Art', 'Mastodon', 'BlueSky', 'Short Facts']

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

// Some feeds answer to the proxy, but not to GitHub Actions IPs, and the
// proxy loads the feeds exactly like the web client does for the users
setProxyAsRequestMethod(
  'https://proxy.dev.slowreader.app/',
  'https://dev.slowreader.app'
)

await startLocalUser(generateCredentials())
isDemo.set(true)

currentPage.listen(() => {})
openRoute({ params: {}, route: 'import' })
let opened = currentPage.get()
if (opened.route !== 'import') {
  error(new Error(`Opened ${opened.route} instead of the import page`))
  finish('Demo database was not built')
}
let page = opened as ImportPage

printAboveProgress('Adding feeds from demo-feeds.opml')
let opml = readFileSync(OPML, 'utf8')
let added: Promise<void>[] = []
let unbindAdded = page.lastAdded.listen(url => {
  added.push(
    loadFeedByUrl(url).then(feed => {
      success(`Added ${feed!.title}`)
    })
  )
})
// Broken source is just not added to the demo
let unbindErrors = page.feedErrors.listen(errors => {
  let last = errors.at(-1)
  if (last) warning(`Skipped ${last[0]}: ${last[1]}`)
})
await page.importFile(
  new File([opml], 'demo.opml', { type: 'application/xml' })
)
await Promise.all(added)
unbindAdded()
unbindErrors()

printAboveProgress('')
printAboveProgress('Adding feeds from demo-sources.json')

let sources = JSON.parse(readFileSync(SOURCES, 'utf8')) as Record<
  string,
  { title: string; url: string }[]
>
let task = createDownloadTask()
for (let [title, feeds] of Object.entries(sources)) {
  let categoryId = await addCategory({ title })
  for (let feed of feeds) {
    let url = feed.url
    try {
      let response = await task.text(feed.url)
      let candidate = await getLoaderForText(response, task, feed.url)
      if (!candidate) {
        warning(`Skipped ${feed.url}: unknown`)
        continue
      }
      url = candidate.url
      await addCandidate(
        candidate,
        { categoryId, title: feed.title },
        task,
        response
      )
      success(`Added ${feed.title}`)
    } catch (e) {
      if (!isRemoteError(e)) throw e
      warning(`Skipped ${feed.url}: ${errorToMessage(e)}`)
      // The feed is saved before its posts
      let broken = await loadFeedByUrl(url)
      if (broken) await deleteFeed(broken.id)
    }
  }
}

let categories = await loadCategories()
for (let title of FAST) {
  let category = categories.find(i => i.title === title)
  if (!category) {
    error(new Error(`Category ${title} from FAST was not found`))
    continue
  }
  let feeds = await loadFeedsByCategory(category.id)
  await changeFeed(
    feeds.map(feed => feed.id),
    { reading: 'fast' }
  )
}

printAboveProgress('')
printAboveProgress(`Loading posts for the last ${DAYS} days`)
await moveLastSyncedToPast(DAYS)
let processed = 0
let found = 0
let unbindRefresh = refreshStatistics.listen(stats => {
  if (stats.processedFeeds === processed) return
  if (processed === 0) startProgress(stats.totalFeeds)
  processed = stats.processedFeeds
  let posts = stats.foundFast + stats.foundSlow
  printAboveProgress(
    `  ${processed} of ${stats.totalFeeds} feeds +${posts - found} posts`,
    'status'
  )
  found = posts
  setProgress(processed)
})
// Build environment keeps the media in memory, so it is not in the database
cacheMediaReading.set('none')
await refreshPosts()
unbindRefresh()
delete storage['slowreader:cacheMediaReading']
for (let failed of refreshErrors.get()) {
  warning(`Skipped ${failed.feed.url}: ${errorToMessage(failed.error)}`)
  await deleteFeed(failed.feed.id)
}
for (let warned of warnings) {
  if (!isRemoteError(warned)) error(warned)
}
let empty = await getCrdt().select<{ title: string }>`
  SELECT "feeds"."title" FROM "feeds"
  LEFT JOIN "posts" ON "posts"."feedId" = "feeds"."id"
  GROUP BY "feeds"."id" HAVING COUNT("posts"."id") = 0
`
for (let feed of empty) {
  warning(`No posts in ${DAYS} days: ${feed.title}`)
}

printAboveProgress('')

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
success(
  'Wrote public/demo.json',
  `${Math.round(statSync(MANIFEST).size / 1024)} KB`
)

finish('Demo database is ready')
