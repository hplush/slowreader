import { persistentAtom } from '@nanostores/persistent'

import { busyDuring } from './busy.ts'
import { addCategory } from './category.ts'
import { client } from './client.ts'
import { addFeed } from './feed.ts'
import { setLoaderReporter } from './loader.ts'
import { benchmarkMessages } from './messages/index.ts'
import {
  addPost,
  type NewPost,
  type PostValue,
  stringifyMedia
} from './post.ts'
import { setRequestMethod } from './request.ts'
import { encryptionKey, userId } from './settings.ts'

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

let newest = Math.round(Date.now() / 1000)

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
  let old = Math.round(Date.now() / 1000) - HOUR

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

// Random distribution can’t promise them on small database of debug mode.
const ANCHORS: [PostValue['reading'], number][] = [
  ['slow', 300],
  ['slow', 150],
  ['fast', 300]
]

// Feed reader is set here, so benchmark will not switch reader before scenario
const READER_FEED = 'feed-1'

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
  return {
    feedId,
    full: paragraphs(random),
    id: `${feedId}-post-${index}`,
    intro: `<p>${sentence(random, 15, 40)}.</p>`,
    media:
      random() < 0.2
        ? stringifyMedia([{ type: 'image/svg+xml', url: IMAGE }])
        : undefined,
    originId: `${feedId}-post-${index}`,
    publishedAt: now - Math.floor(random() ** 2 * YEAR),
    read: 0,
    reading,
    title: sentence(random, 3, 9),
    url: `https://example.com/${feedId}/post-${index}`
  }
}

async function fillClient(
  progress: (done: number, total: number) => void
): Promise<FillStatistics> {
  let size = debug
    ? { categories: 2, feeds: 10 }
    : // Remove after fixing app’s memory usage. Right now the full benchmark
      // is killing the browser.
      // : { categories: 20, feeds: 1000 }
      { categories: 10, feeds: 100 }
  let random = createRandom(SEED)
  let started = performance.now()
  let now = Math.round(Date.now() / 1000)

  let categories = ['general']
  for (let i = 1; i < size.categories; i++) {
    categories.push(await addCategory({ title: sentence(random, 1, 3) }))
  }

  let biggestCategory = 'general'
  let biggestFast = 0
  let posts = 0
  let slow: [string, number][] = []
  for (let i = 0; i < size.feeds; i++) {
    let anchor = ANCHORS[i]
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
      slowReader: feedId === READER_FEED ? 'feed' : undefined,
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
 * Statistics of the last created benchmark data.
 */
export const benchmarkStatistics = persistentAtom<FillStatistics | undefined>(
  'slowreader:benchmark',
  undefined,
  {
    decode(value) {
      return JSON.parse(value) as FillStatistics
    },
    encode(value) {
      return JSON.stringify(value)
    }
  }
)

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

/**
 * Create local benchmark user to get the client without the server.
 */
export async function signInBenchmark(): Promise<void> {
  if (userId.get() !== '9999999999999999') {
    encryptionKey.set('benchmarkKey')
    userId.set('9999999999999999')
  }
  if (!client.get()) {
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
}

/**
 * Create categories, feeds and posts and save statistics about them.
 */
export async function fillBenchmarkData(): Promise<FillStatistics> {
  let statistics = await busyDuring(
    benchmarkMessages.get().creatingData,
    setProgress => {
      return fillClient((done, total) => {
        setProgress(done / total)
      })
    }
  )
  benchmarkStatistics.set(statistics)
  return statistics
}
