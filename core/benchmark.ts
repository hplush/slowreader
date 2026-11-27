import {
  type Credentials,
  generateCredentials,
  signUpByPassword,
  startLocalUser
} from './auth.ts'
import { busy, busyDuring } from './busy.ts'
import { addCategory } from './category.ts'
import { client } from './client.ts'
import { addFeed } from './feed.ts'
import { nowInSeconds } from './lib/date.ts'
import { setLoaderReporter } from './loader.ts'
import { benchmarkMessages, commonMessages } from './messages/index.ts'
import { addPost, type NewPost, type PostValue, uniqueMedia } from './post.ts'
import { setRequestMethod } from './request.ts'
import { GENERAL_CATEGORY, getCrdt } from './schema.ts'
import { benchmarkStatistics, userId } from './settings.ts'

export interface LoaderSpan {
  end: number | undefined
  name: string
  start: number
}

let rendered = new Set<LoaderSpan>()
let spans: LoaderSpan[] | undefined

setLoaderReporter(name => {
  let span: LoaderSpan = { end: undefined, name, start: performance.now() }
  rendered.add(span)
  spans?.push(span)
  return () => {
    span.end = performance.now()
    rendered.delete(span)
  }
})

/**
 * Start to collect spans of all rendered loaders. Returns function to stop
 * and to get all spans.
 */
export function recordLoaders(): () => LoaderSpan[] {
  let started: LoaderSpan[] = []
  spans = started
  return () => {
    if (spans === started) spans = undefined
    return started
  }
}

/**
 * Loaders, which are rendered right now.
 */
export function getRenderedLoaders(): LoaderSpan[] {
  return [...rendered]
}

export interface FillStatistics {
  biggestCategory: string
  debug: boolean
  duration: number
  feeds: number
  posts: number
  readerFeed: string
  slowFeeds: string[]
  upload: number
  uploadSync: number
}

let debug = false

/**
 * Use small database and single run of every scenario to develop benchmark
 * faster. Client should set it from `DEBUG=1` or `?benchmark=debug`.
 */
export function setBenchmarkDebug(value: boolean): void {
  debug = value
}

/**
 * How many times every scenario should be repeated.
 */
export function getBenchmarkRuns(): number {
  return debug ? 1 : 5
}

/**
 * How many failed runs stop the scenario.
 */
export const BENCHMARK_GIVE_UP = 2

const SEED = 1

const MINUTE = 60

const HOUR = 60 * 60

const YEAR = 365 * 24 * 60 * 60

let newest = nowInSeconds()

const DISTRIBUTION: [number, number, number][] = [
  [0.4, 0, 10],
  [0.35, 10, 50],
  [0.15, 50, 200],
  [0.08, 200, 800],
  [0.02, 800, 2000]
]

const WORDS = `about after again below could every first found great house
large learn light might never other place plant point right small sound spell
still study their there these thing think three under water where which world
would write years animal answer became better between change during enough
follow ground itself listen mother number people person picture problem school
second sentence several southern together toward without`.split(/\s+/)

const IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">' +
      '<rect width="600" height="400" fill="#8899aa" /></svg>'
  )

function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function between(random: () => number, from: number, to: number): number {
  return from + Math.floor(random() * (to - from))
}

function words(random: () => number, from: number, to: number): string {
  let list: string[] = []
  for (let i = between(random, from, to); i > 0; i--) {
    list.push(WORDS[between(random, 0, WORDS.length)]!)
  }
  return list.join(' ')
}

function sentence(random: () => number, from: number, to: number): string {
  let text = words(random, from, to)
  return text[0]!.toUpperCase() + text.slice(1)
}

function paragraphs(random: () => number): string {
  let list: string[] = []
  for (let i = between(random, 2, 6); i > 0; i--) {
    list.push(`<p>${sentence(random, 20, 60)}.</p>`)
  }
  return list.join('')
}

function item(id: string, postId: string, published: number): string {
  return (
    `<item><guid>${postId}</guid>` +
    `<title>${postId}</title>` +
    `<link>https://example.com/${id}/${postId}</link>` +
    `<pubDate>${new Date(published * 1000).toUTCString()}</pubDate>` +
    `<description>Benchmark post ${postId}</description></item>`
  )
}

function rss(url: string): string {
  let id = new URL(url).pathname.replace(/^\//, '').replace(/\.xml$/, '')
  let index = Number(id.match(/\d+$/)?.[0] ?? 0)
  let old = nowInSeconds() - HOUR

  let items = ''
  if (index % 5 === 0) {
    for (let i = 0; i < 3; i++) {
      newest += MINUTE
      items += item(id, `${id}-new-${newest}`, newest)
    }
  }
  for (let i = 0; i < 10; i++) {
    items += item(id, `${id}-post-${i}`, old)
  }

  return (
    `<?xml version="1.0"?><rss version="2.0"><channel>` +
    `<title>${id}</title><link>https://example.com/${id}</link>` +
    `${items}</channel></rss>`
  )
}

/**
 * Feeds with a fixed size, which random distribution can’t promise
 * on the small database of debug mode.
 *
 * Both slow feeds are huge, because the readers must be measured on a feed
 * which does not fit into a few pages: scenarios take the biggest slow feed
 * for the list reader and `READER_FEED` for the feed reader.
 */
function getAnchors(): [PostValue['reading'], number][] {
  let huge = debug ? 200 : 5000
  return [
    ['slow', huge],
    ['slow', huge],
    ['fast', 300]
  ]
}

// Feed reader is set here, so benchmark will not switch reader before scenario
const READER_FEED_INDEX = 1
const READER_FEED = `feed-${READER_FEED_INDEX}`

// Unread posts to keep in the reader’s feed for the `read-page` scenario
const READER_FEED_POSTS = 120

const POSTS_BATCH = 100

function postsInFeed(random: () => number): number {
  let point = random()
  let sum = 0
  for (let [share, from, to] of DISTRIBUTION) {
    sum += share
    if (point <= sum) return between(random, from, to)
  }
  return 0
}

function createPost(
  random: () => number,
  feedId: string,
  index: number,
  reading: PostValue['reading'],
  now: number
): NewPost {
  let publishedAt = now - Math.floor(random() ** 2 * YEAR)
  return {
    feedId,
    full: paragraphs(random),
    id: `${feedId}-post-${index}`,
    intro: `<p>${sentence(random, 15, 40)}.</p>`,
    media:
      random() < 0.2
        ? uniqueMedia([{ type: 'image/svg+xml', url: IMAGE }])
        : undefined,
    originId: `${feedId}-post-${index}`,
    publishedAt,
    read: 0,
    reading,
    sortedAt: publishedAt,
    title: sentence(random, 3, 9),
    url: `https://example.com/${feedId}/post-${index}`
  }
}

async function fillClient(
  progress: (done: number, total: number) => void
): Promise<Omit<FillStatistics, 'upload' | 'uploadSync'>> {
  let size = debug
    ? { categories: 2, feeds: 10 }
    : // Remove after fixing app’s memory usage. Right now the full benchmark
      // is killing the browser.
      // : { categories: 20, feeds: 1000 }
      { categories: 10, feeds: 100 }
  let random = createRandom(SEED)
  let started = performance.now()
  let now = nowInSeconds()

  let categories = [GENERAL_CATEGORY]
  for (let i = 1; i < size.categories; i++) {
    categories.push(await addCategory({ title: sentence(random, 1, 3) }))
  }

  let anchors = getAnchors()
  let biggestCategory = GENERAL_CATEGORY
  let biggestFast = 0
  let posts = 0
  let slow: [string, number][] = []
  for (let i = 0; i < size.feeds; i++) {
    let anchor = anchors[i]
    let reading: PostValue['reading'] =
      anchor?.[0] ?? (random() < 0.7 ? 'fast' : 'slow')
    let categoryId = categories[between(random, 0, categories.length)]!
    let feedId = `feed-${i}`
    await addFeed({
      categoryId,
      id: feedId,
      lastOriginId: `${feedId}-post-0`,
      lastPublishedAt: now,
      loader: 'rss',
      reading,
      refreshedAt: now,
      reader: feedId === READER_FEED ? 'feed' : undefined,
      title: sentence(random, 1, 4),
      url: `https://example.com/${feedId}.xml`
    })

    let count = anchor?.[1] ?? postsInFeed(random)
    let batch: NewPost[] = []
    for (let j = 0; j < count; j++) {
      batch.push(createPost(random, feedId, j, reading, now))
      if (batch.length === POSTS_BATCH) {
        await addPost(batch)
        batch = []
      }
    }
    if (batch.length > 0) await addPost(batch)

    if (reading === 'slow') {
      slow.push([feedId, count])
    } else if (count > biggestFast) {
      biggestCategory = categoryId
      biggestFast = count
    }
    posts += count
    progress(i + 1, size.feeds)
  }

  return {
    biggestCategory,
    debug,
    duration: performance.now() - started,
    feeds: size.feeds,
    posts,
    readerFeed: READER_FEED,
    slowFeeds: slow
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(i => i[0])
  }
}

/**
 * Fill the reader’s feed back before the `read-page` scenario.
 *
 * The scenario marks a page as read on every run, and read posts are hidden
 * on leaving the page. Without filling, the feed ends after a few runs,
 * the reader shows the empty screen and there is no button to click.
 */
export async function fillReaderFeed(): Promise<void> {
  let crdt = getCrdt()
  let [ids, unread] = await Promise.all([
    crdt.select<{ id: string }>`
      SELECT "id" FROM "posts" WHERE "feedId" = ${READER_FEED}
    `,
    crdt.select<{ total: number }>`
      SELECT COUNT("id") AS "total" FROM "posts"
      WHERE "feedId" = ${READER_FEED} AND "read" = 0
    `
  ])
  let missing = READER_FEED_POSTS - unread[0]!.total
  if (missing <= 0) return

  // Deleted posts free their index, so new posts continue from the last one
  let last = 0
  for (let { id } of ids) {
    let index = Number(id.slice(id.lastIndexOf('-') + 1))
    if (index > last) last = index
  }

  let random = createRandom(SEED)
  let now = nowInSeconds()
  let reading = getAnchors()[READER_FEED_INDEX]![0]
  for (let i = 0; i < missing; i += POSTS_BATCH) {
    let batch: NewPost[] = []
    for (let j = i; j < Math.min(i + POSTS_BATCH, missing); j++) {
      batch.push(createPost(random, READER_FEED, last + j + 1, reading, now))
    }
    await addPost(batch)
  }
}

/**
 * Answer feed requests with generated RSS instead of the network.
 */
export function mockBenchmarkRequests(): void {
  setRequestMethod(url => {
    let known = /^\/(new-)?feed-\d+\.xml$/.test(new URL(url).pathname)
    let response = new Response(known ? rss(url) : '', {
      headers: {
        'Content-Type': known ? 'application/rss+xml' : 'text/plain'
      }
    })
    Object.defineProperty(response, 'url', { value: url })
    return Promise.resolve(response)
  })
}

export async function waitBenchmarkClient(): Promise<void> {
  if (client.get()) return
  await new Promise<void>(resolve => {
    let unbind = client.subscribe(logux => {
      if (logux) {
        setTimeout(() => {
          unbind()
          resolve()
        })
      }
    })
  })
}

/**
 * Wait until every action was sent to the server, so the sync of the filling
 * will not be measured by the scenarios.
 */
export async function waitBenchmarkSync(): Promise<void> {
  let logux = client.get()
  if (!logux) return
  await logux.waitFor('synchronized')
}

// `synchronized` state comes before the server processed the actions
async function waitUploadConfirmed(): Promise<void> {
  let logux = client.get()!
  let waiting = true
  while (waiting) {
    waiting = false
    await logux.log.each({ reason: 'syncing' }, () => {
      waiting = true
      return false
    })
    if (waiting) {
      await new Promise(resolve => {
        setTimeout(resolve, 100)
      })
    }
  }
}

async function uploadBenchmarkData(
  credentials: Credentials
): Promise<Pick<FillStatistics, 'upload' | 'uploadSync'>> {
  let start = performance.now()
  let uploaded = new Promise<void>(resolve => {
    let uploading = false
    let unbind = busy.subscribe(value => {
      if (value && value.label === commonMessages.get().uploadingData) {
        uploading = true
      } else if (uploading) {
        unbind()
        resolve()
      }
    })
  })
  await signUpByPassword(credentials)
  await uploaded
  let upload = performance.now() - start
  await waitBenchmarkClient()
  await waitUploadConfirmed()
  return { upload, uploadSync: performance.now() - start }
}

/**
 * Create categories, feeds and posts as a local user, then sign up
 * and upload them to the cloud. Save statistics about both steps.
 */
export async function fillBenchmarkData(): Promise<FillStatistics> {
  if (userId.get()) {
    throw new Error('Call benchmark.clean() to fill the database again')
  }
  let credentials = generateCredentials()
  await startLocalUser(credentials)
  await waitBenchmarkClient()
  let filled = await busyDuring(
    benchmarkMessages.get().creatingData,
    setProgress => {
      return fillClient((done, total) => {
        setProgress(done / total)
      })
    }
  )
  let uploading = await uploadBenchmarkData(credentials)
  let statistics = { ...filled, ...uploading }
  benchmarkStatistics.set(statistics)
  return statistics
}
