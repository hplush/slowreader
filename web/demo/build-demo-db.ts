// Script to build the database and the settings for the demo mode.

import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import {
  addCandidate,
  addCategory,
  addReaction,
  addView,
  cacheMediaReading,
  changeFeed,
  createDownloadTask,
  currentPage,
  deleteFeed,
  deletePost,
  errorToMessage,
  fastPostsMaxAge,
  findFeed,
  generateCredentials,
  getCrdt,
  getDatabase,
  type ImportPage,
  isDemo,
  isRemoteError,
  loadCategories,
  loadFeedByUrl,
  loadFeedsByCategory,
  moveLastSyncedToPast,
  type NewReaction,
  type NewView,
  refreshErrors,
  refreshPosts,
  refreshStatistics,
  setProxyAsRequestMethod,
  setupEnvironment,
  startLocalUser,
  STATS_DAYS
} from '@slowreader/core'
import { setupNodeDom } from '@slowreader/core/node'
import {
  getTestEnvironment,
  openRoute,
  setWarningTracking
} from '@slowreader/core/test'
import { createHash, randomUUID } from 'node:crypto'
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

interface Habit {
  /**
   * How many old posts of the feed get a dislike.
   */
  disliked: number
  liked: number
  /**
   * Share of seen posts, which user opened.
   */
  opened: number
  /**
   * For how many last days user does not read the feed.
   */
  quit: number
  /**
   * Share of published posts, which user saw.
   */
  read: number
}

const FAVOURITE = { disliked: 0, liked: 7, opened: 0.2, quit: 0, read: 1 }
const USUAL = { disliked: 1, liked: 3, opened: 0.15, quit: 0, read: 0.8 }
const NOISY = { disliked: 3, liked: 1, opened: 0.1, quit: 0, read: 0.4 }
const ABANDONED = { disliked: 0, liked: 0, opened: 0.1, quit: 30, read: 0.6 }

/**
 * The rest of the feeds get the habit by the hash of their URL.
 */
const BY_HAND: Record<string, Habit> = {
  'https://slowreader.app/releases.atom': FAVOURITE
}

const BY_HASH: Habit[] = [
  FAVOURITE,
  FAVOURITE,
  USUAL,
  USUAL,
  USUAL,
  USUAL,
  USUAL,
  NOISY,
  NOISY,
  ABANDONED
]

/**
 * The same numbers on every build keep the landing screenshots stable.
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

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
      let { feed: candidate, response } = await findFeed(task, feed.url)
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
delete storage['slowreader:userId']
for (let failed of refreshErrors.get()) {
  if ('feed' in failed) {
    warning(`Skipped ${failed.feed.url}: ${errorToMessage(failed.error)}`)
    await deleteFeed(failed.feed.id)
  }
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

// Reading history of the demo user, so the statistics of the feeds look like
// after a real use. Likes and dislikes go to the oldest loaded posts, which
// are deleted as the app does it with read posts.
let now = Math.floor(Date.now() / 1000)
let today = Math.floor(now / 86400)
let nextVisit = seededRandom(1)
let visitedDaysAgo = Array.from({ length: STATS_DAYS }, () => {
  return nextVisit() < 0.75
})
let followed = await getCrdt().select<{ id: string; url: string }>`
  SELECT "id", "url" FROM "feeds"
`
let views: NewView[] = []
let reactions: NewReaction[] = []
let read: string[] = []
for (let feed of followed) {
  let posts = await getCrdt().select<{
    id: string
    reading: 'fast' | 'slow'
    sortedAt: number
    threadId: null | string
    url: null | string
  }>`
    SELECT "id", "reading", "sortedAt", "threadId", "url" FROM "posts"
    WHERE "feedId" = ${feed.id} AND "merged" = 0 ORDER BY "sortedAt"
  `
  let oldest = posts[0]
  if (!oldest) continue
  let next = seededRandom(
    createHash('sha256').update(feed.url).digest().readUInt32LE(0)
  )
  let habit = BY_HAND[feed.url] ?? BY_HASH[Math.floor(next() * BY_HASH.length)]!
  let perDay =
    posts.length / Math.min(DAYS, Math.max(1, (now - oldest.sortedAt) / 86400))

  let days: NewView['days'] = []
  let unread = 0
  for (let ago = STATS_DAYS - 1; ago >= Math.max(1, habit.quit); ago--) {
    unread += perDay * habit.read * (0.5 + next())
    if (!visitedDaysAgo[ago]) continue
    let count = Math.floor(unread)
    if (count === 0) continue
    unread -= count
    days.push({ count, day: today - ago })
  }
  if (days.length === 0) continue
  views.push({
    day: days.at(-1)!.day,
    days,
    feedId: feed.id,
    id: `demo:${feed.id}`
  })

  // The first refresh deletes these posts anyway
  let old = posts.filter(post => {
    return (
      post.reading === 'fast' && post.sortedAt < now - fastPostsMaxAge.get()
    )
  })
  if (old.length === 0) old = posts.slice(0, Math.floor(posts.length / 4))
  for (let post of old
    .filter(i => i.url && !i.threadId)
    .slice(0, habit.liked + habit.disliked)) {
    reactions.push({
      at: Math.min(now, post.sortedAt + 86400),
      feedId: feed.id,
      id: post.id,
      type:
        next() < habit.disliked / (habit.liked + habit.disliked)
          ? 'dislike'
          : 'like',
      url: post.url
    })
    read.push(post.id)
  }

  let seen = days.reduce((sum, day) => sum + day.count, 0)
  for (let i = 0; i < Math.round(seen * habit.opened); i++) {
    reactions.push({
      at:
        days[Math.floor(next() * days.length)]!.day * 86400 +
        Math.floor(next() * 86400),
      feedId: feed.id,
      id: randomUUID(),
      type: next() < 0.7 ? 'open' : 'link'
    })
  }
}
await addView(views)
await addReaction(reactions)
await deletePost(read)
success('Added reading history of the demo user')

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
