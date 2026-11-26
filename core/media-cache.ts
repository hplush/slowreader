import type { Database } from '@nanostores/sql'
import { atom, computed, effect, map } from 'nanostores'

import { deviceSessions } from './device-sessions.ts'
import { type CachedMedia, getEnvironment } from './environment.ts'
import { HTTPStatusError, TelegramError } from './errors.ts'
import { createDownloadTask } from './lib/download.ts'
import { isLoaderMedia } from './lib/html.ts'
import { canUseNetwork } from './lib/network.ts'
import { createQueue } from './lib/queue.ts'
import { increaseKey } from './lib/stores.ts'
import { loadLoaderMedia, type Urgency } from './loader/index.ts'
import { changePost, loadPost } from './post.ts'
import {
  getCrdt,
  getDatabase,
  getTables,
  type MediaSize,
  openedDatabase,
  type PostMedia,
  type PostValue,
  type QuotedPost
} from './schema.ts'
import {
  cacheImages,
  cacheMediaReading,
  cacheVideos,
  usedRequestMethod
} from './settings.ts'

export const DEFAULT_MEDIA_STATISTICS = {
  done: 0,
  failed: 0,
  total: 0
}

export type MediaStatistics = typeof DEFAULT_MEDIA_STATISTICS

export const mediaStatistics = map({ ...DEFAULT_MEDIA_STATISTICS })

export type MediaError =
  | { error: Error; type: 'file'; url: string }
  | { error: Error; type: 'quota' }

export const mediaErrors = atom<MediaError[]>([])

function failMedia(item: MediaError): void {
  let list = mediaErrors.get()
  // Parallel downloads hit the full disk together
  if (item.type === 'file' || !list.some(i => i.type === 'quota')) {
    mediaErrors.set([...list, item])
  }
  increaseKey(mediaStatistics, 'failed')
}

export const mediaCacheEnabled = computed(
  [cacheMediaReading, cacheImages, cacheVideos],
  (reading, images, videos) => {
    return reading !== 'none' && (images !== 'never' || videos !== 'never')
  }
)

export const mediaProgress = computed(mediaStatistics, stats => {
  if (stats.total === 0) return 0
  return Math.floor(((stats.done + stats.failed) / stats.total) * 100) / 100
})

type SizedField = 'media' | 'quoted' | 'replied'

/**
 * Place in the post, where the real sizes of the file should be written.
 */
interface SizeTarget {
  field: SizedField
  index: number
  postId: string
}

interface WantedMedia {
  targets: SizeTarget[]
  video: boolean
}

type MediaPostRow = Pick<
  PostValue,
  | 'author'
  | 'id'
  | 'media'
  | 'mediaSizes'
  | 'preview'
  | 'quoted'
  | 'replied'
  | 'repostedBy'
>

function isPlaylist(url: string, item: PostMedia): boolean {
  return (
    /\.m3u8(\?|$)/i.test(url) ||
    !!item.sources?.some(i => i.url === url && /mpegurl/i.test(i.type))
  )
}

function addUrl(
  wanted: Map<string, WantedMedia>,
  url: null | string | undefined,
  video: boolean,
  target?: SizeTarget
): void {
  if (!url) return
  let href: string
  try {
    // Cache returns normalized URLs
    href = new URL(url).href
  } catch {
    return
  }
  let item = wanted.get(href) ?? { targets: [], video }
  if (target) item.targets.push(target)
  wanted.set(href, item)
}

function addMedia(
  wanted: Map<string, WantedMedia>,
  media: null | PostMedia[] | undefined,
  postId: string,
  field: SizedField
): void {
  for (let [index, item] of (media ?? []).entries()) {
    addUrl(wanted, item.poster, false)
    if (item.type.startsWith('image')) {
      addUrl(wanted, item.url, false, { field, index, postId })
    } else if (item.type.startsWith('video')) {
      if (!isPlaylist(item.url, item)) {
        addUrl(wanted, item.url, true, { field, index, postId })
      }
      for (let source of item.sources ?? []) {
        if (!isPlaylist(source.url, item)) addUrl(wanted, source.url, true)
      }
    }
  }
}

function addQuoted(
  wanted: Map<string, WantedMedia>,
  quoted: null | QuotedPost | undefined,
  postId: string,
  field: 'quoted' | 'replied'
): void {
  if (!quoted) return
  addUrl(wanted, quoted.author?.avatar, false)
  addUrl(wanted, quoted.preview?.image, false)
  addMedia(wanted, quoted.media, postId, field)
}

/**
 * Local table of files, which posts need offline.
 * Logux does not touch it on schema changes or cleaning.
 */
async function createMediaTable(db: Database): Promise<void> {
  await db.exec`
    CREATE TABLE IF NOT EXISTS "mediaFiles" (
      "postId" TEXT NOT NULL,
      "url" TEXT,
      "video" INTEGER NOT NULL DEFAULT 0,
      "field" TEXT,
      "position" INTEGER
    )
  `
  await db.exec`
    CREATE INDEX IF NOT EXISTS "mediaFilesPost" ON "mediaFiles" ("postId")
  `
  await db.exec`
    CREATE INDEX IF NOT EXISTS "mediaFilesUrl" ON "mediaFiles" ("url")
  `
}

/**
 * Parse only posts, which were not parsed before. Posts without files get
 * a row without URL to not be parsed again. Posts in the history are skipped,
 * since their files were deleted on leaving the reader.
 */
async function findNewPostsMedia(): Promise<void> {
  let rows: MediaPostRow[]
  do {
    rows = await getCrdt().select<MediaPostRow>`
      SELECT "posts"."id", "posts"."author", "posts"."media",
        "posts"."mediaSizes", "posts"."preview", "posts"."quoted",
        "posts"."replied", "posts"."repostedBy"
      FROM "posts"
      LEFT JOIN "mediaFiles" ON "mediaFiles"."postId" = "posts"."id"
      WHERE "mediaFiles"."postId" IS NULL AND "posts"."read" < 2
      LIMIT 500
    `
    let inserts: MediaFileInsert[] = []
    for (let row of rows) {
      let post = getTables().posts.parseRow(row)
      let files = new Map<string, WantedMedia>()
      addUrl(files, post.author?.avatar, false)
      addUrl(files, post.repostedBy?.avatar, false)
      addUrl(files, post.preview?.image, false)
      addMedia(files, post.media, post.id, 'media')
      addQuoted(files, post.quoted, post.id, 'quoted')
      addQuoted(files, post.replied, post.id, 'replied')
      if (files.size === 0) inserts.push({ postId: post.id, video: 0 })
      for (let [url, file] of files) {
        let video = file.video ? 1 : 0
        if (file.targets.length === 0) {
          inserts.push({ postId: post.id, url, video })
        }
        for (let target of file.targets) {
          inserts.push({
            field: target.field,
            position: target.index,
            postId: post.id,
            url,
            video
          })
        }
      }
    }
    // A single statement is atomic without a transaction, which would
    // collide with Logux transactions on the same connection
    await getDatabase().exec`
      INSERT INTO "mediaFiles" ("postId", "url", "video", "field", "position")
      SELECT
        json_extract("value", '$.postId'), json_extract("value", '$.url'),
        json_extract("value", '$.video'), json_extract("value", '$.field'),
        json_extract("value", '$.position')
      FROM json_each(${JSON.stringify(inserts)})
    `
  } while (rows.length === 500)
}

interface MediaFileInsert {
  field?: SizedField
  position?: number
  postId: string
  url?: string
  video: number
}

interface MediaFileRow {
  field: null | SizedField
  position: null | number
  postId: string
  url: string
  video: number
}

/**
 * Media of posts and feed avatars, the newest first.
 */
async function loadWantedMedia(
  images: boolean,
  videos: boolean,
  onlySlow: boolean
): Promise<Map<string, WantedMedia>> {
  let wanted = new Map<string, WantedMedia>()
  // Loader needs to start its library to give an avatar again, so the menu
  // would wait for it on every start. We keep these small files with any
  // settings, after the page asked for them.
  let avatars = await getCrdt().select<{ avatar: string }>`
    SELECT "avatar" FROM "feeds" WHERE "avatar" IS NOT NULL
    UNION SELECT "avatar" FROM "accounts" WHERE "avatar" IS NOT NULL
  `
  for (let { avatar } of avatars) {
    if (isLoaderMedia(avatar)) addUrl(wanted, avatar, false)
  }
  if (!images && !videos) return wanted

  let db = getDatabase()
  await createMediaTable(db)
  // Sign-out and database reset drop posts without the deleted actions
  await db.exec`
    DELETE FROM "mediaFiles" WHERE "postId" NOT IN (SELECT "id" FROM "posts")
  `
  await findNewPostsMedia()

  if (images) {
    let feeds = await getCrdt().select<{ avatar: string }>`
      SELECT "avatar" FROM "feeds"
      WHERE "avatar" IS NOT NULL
        AND (${onlySlow ? 1 : 0} = 0 OR "reading" = 'slow')
    `
    for (let feed of feeds) addUrl(wanted, feed.avatar, false)
  }

  let files = await getCrdt().select<MediaFileRow>`
    SELECT "mediaFiles".* FROM "mediaFiles"
    JOIN "posts" ON "posts"."id" = "mediaFiles"."postId"
    WHERE "mediaFiles"."url" IS NOT NULL
      AND (${onlySlow ? 1 : 0} = 0 OR "posts"."reading" = 'slow')
      AND COALESCE(json_extract(
        CASE "mediaFiles"."field"
          WHEN 'media' THEN "posts"."mediaSizes"
          WHEN 'quoted' THEN json_extract("posts"."quoted", '$.mediaSizes')
          WHEN 'replied' THEN json_extract("posts"."replied", '$.mediaSizes')
        END,
        '$[' || "mediaFiles"."position" || '].bytes'
      ), 0) <= ${100 * 1024 * 1024}
    ORDER BY "posts"."sortedAt" DESC
  `
  for (let file of files) {
    if (file.video ? !videos : !images) continue
    let item = wanted.get(file.url) ?? { targets: [], video: !!file.video }
    if (file.field && file.position !== null) {
      item.targets.push({
        field: file.field,
        index: file.position,
        postId: file.postId
      })
    }
    wanted.set(file.url, item)
  }
  return wanted
}

function updateSizes(
  sizes: (MediaSize | null)[] | null | undefined,
  length: number,
  index: number,
  real: CachedMedia
): (MediaSize | null)[] | undefined {
  let current = sizes?.[index]
  let height = real.height ?? current?.height ?? undefined
  let width = real.width ?? current?.width ?? undefined
  if (
    current &&
    !current.approximate &&
    current.bytes === real.bytes &&
    current.width === width &&
    current.height === height
  ) {
    return undefined
  }
  let updated = Array.from({ length }, (_, i) => sizes?.[i] ?? null)
  updated[index] = { bytes: real.bytes, height, width }
  return updated
}

/**
 * Real sizes are synced, so other devices get the ratio without downloading.
 */
async function saveSizes(found: [SizeTarget, CachedMedia][]): Promise<void> {
  let ids = [...new Set(found.map(([target]) => target.postId))]
  let posts = new Map(
    await Promise.all(ids.map(async id => [id, await loadPost(id)] as const))
  )
  let changed = new Map<string, MediaPostRow>()
  for (let [target, real] of found) {
    let post = changed.get(target.postId) ?? posts.get(target.postId)
    if (!post) continue
    if (target.field === 'media') {
      let sizes = updateSizes(
        post.mediaSizes,
        post.media?.length ?? 0,
        target.index,
        real
      )
      if (sizes) changed.set(post.id, { ...post, mediaSizes: sizes })
    } else {
      let quoted = post[target.field]
      if (!quoted) continue
      let sizes = updateSizes(
        quoted.mediaSizes,
        quoted.media?.length ?? 0,
        target.index,
        real
      )
      if (sizes) {
        changed.set(post.id, {
          ...post,
          [target.field]: { ...quoted, mediaSizes: sizes }
        })
      }
    }
  }
  // Parallel changes are applied by one transaction instead of one per post
  await Promise.all(
    [...changed].map(([id, post]) => {
      let original = posts.get(id)!
      return changePost(id, {
        ...(post.mediaSizes !== original.mediaSizes && {
          mediaSizes: post.mediaSizes
        }),
        ...(post.quoted !== original.quoted && { quoted: post.quoted }),
        ...(post.replied !== original.replied && { replied: post.replied })
      })
    })
  )
}

let queues = [createQueue<string>([])]
let stopped = false
let dropped = new Set<string>()

function canLoadOnThisDevice(url: string): boolean {
  return (
    !isLoaderMedia(url) ||
    Object.values(deviceSessions.get()).some(session => {
      return url.startsWith(`${session.service}:`)
    })
  )
}

/**
 * Download missing media of posts and delete media, which nobody
 * needs anymore. Deleted or read posts are found here, because the deleted
 * row has no URLs to clean and the delete can come from another device.
 */
export async function syncMediaCache(): Promise<void> {
  stopped = false
  let reading = cacheMediaReading.get()
  let images = cacheImages.get()
  let videos = cacheVideos.get()
  let wanted = await loadWantedMedia(
    reading !== 'none' && images !== 'never',
    reading !== 'none' && videos !== 'never',
    reading === 'slow'
  )
  dropped.clear()
  let cache = getEnvironment().mediaCache
  let cached = new Set(await cache.keys())
  let unused = [...cached].filter(url => !wanted.has(url))
  if (unused.length > 0) await cache.delete(unused)

  let downloadImages = canUseNetwork(images)
  let downloadVideos = canUseNetwork(videos)
  let missing = [...wanted]
    .filter(([url, item]) => {
      return (
        !cached.has(url) &&
        (item.video ? downloadVideos : downloadImages) &&
        canLoadOnThisDevice(url)
      )
    })
    // A long video must not stand before images of older posts
    .toSorted(([, a], [, b]) => Number(a.video) - Number(b.video))
    .map(([url]) => url)
  if (stopped || missing.length === 0) return
  mediaStatistics.set({ ...DEFAULT_MEDIA_STATISTICS, total: missing.length })
  mediaErrors.set([])

  let found: [SizeTarget, CachedMedia][] = []
  // Stuck file of a loader must not hold web files, and they have own limits:
  // the proxy counts requests, the loader counts bytes
  queues = [
    createQueue(missing.filter(url => !isLoaderMedia(url))),
    createQueue(missing.filter(url => isLoaderMedia(url)))
  ]
  try {
    await Promise.all(
      queues.map((queue, index) => {
        return queue.start(
          index === 0 ? 6 : 8,
          url => async task => {
            if (dropped.has(url)) {
              increaseKey(mediaStatistics, 'total', -1)
              return
            }
            if (await cache.has(url)) {
              increaseKey(mediaStatistics, 'done')
              return
            }
            let response: Response
            try {
              response = isLoaderMedia(url)
                ? new Response(await readShared(url, 'later', 'cache'))
                : // Proxy loads media without the per-host delay by this header
                  await task.request(url, {
                    headers: {
                      Accept: wanted.get(url)!.video ? 'video/*' : 'image/*'
                    }
                  })
            } catch (e) {
              if (isMissed(e)) {
                // User can’t fix proxy size limit, so error will be just a noise
                if (
                  usedRequestMethod.get() === 'proxy' &&
                  HTTPStatusError.is(e, [413])
                ) {
                  increaseKey(mediaStatistics, 'failed')
                } else {
                  failMedia({ error: e, type: 'file', url })
                }
                return
              }
              throw e
            }
            let real = await cache.put(url, response)
            forgetSaved(url)
            if (dropped.has(url)) {
              await cache.delete([url])
              increaseKey(mediaStatistics, 'total', -1)
              return
            }
            for (let target of wanted.get(url)!.targets) {
              found.push([target, real])
            }
            increaseKey(mediaStatistics, 'done')
          },
          {
            onRequestError() {},
            onTaskFail(url, error) {
              if (error.name === 'QuotaExceededError') {
                stopMediaCache()
                failMedia({ error, type: 'quota' })
              } else {
                failMedia({ error, type: 'file', url })
              }
            }
          }
        )
      })
    )
  } finally {
    await saveSizes(found)
  }
}

export function isMediaCached(url: string): Promise<boolean> {
  return getEnvironment().mediaCache.has(url)
}

async function savePageCopy(url: string, blob: Blob): Promise<boolean> {
  if (!mediaCacheEnabled.get()) return false
  await createMediaTable(getDatabase())
  let places = await getCrdt().select<MediaFileRow>`
    SELECT "mediaFiles".* FROM "mediaFiles"
    JOIN "posts" ON "posts"."id" = "mediaFiles"."postId"
    WHERE "mediaFiles"."url" = ${url}
      AND (
        ${cacheMediaReading.get() === 'slow' ? 1 : 0} = 0
        OR "posts"."reading" = 'slow'
      )
  `
  let wanted = places.filter(file => {
    return (file.video ? cacheVideos.get() : cacheImages.get()) !== 'never'
  })
  if (wanted.length === 0) return false
  let real = await getEnvironment().mediaCache.put(url, new Response(blob))
  let found: [SizeTarget, CachedMedia][] = []
  for (let file of wanted) {
    if (file.field && file.position !== null) {
      found.push([
        { field: file.field, index: file.position, postId: file.postId },
        real
      ])
    }
  }
  await saveSizes(found)
  return true
}

interface SharedMedia {
  blob: Blob | undefined
  file: Promise<Blob>
  pending: number
  readers: number
  reject(error: unknown): void
  resolve(blob: Blob): void
  retried: boolean
  saved: boolean
  saving: boolean
  stop: AbortController
  urgency: Urgency
}

let shared = new Map<string, SharedMedia>()

let resting = new Map<string, number>()

function forgetUnshown(url: string): void {
  if (shared.get(url)?.readers === 0) {
    shared.delete(url)
    resting.delete(url)
  }
}

function forgetSaved(url: string): void {
  let entry = shared.get(url)
  if (entry) entry.saved = true
  forgetUnshown(url)
}

/**
 * Missed file will not appear on retry, unlike a rate limit.
 */
function isMissed(error: unknown): error is Error {
  let code = 0
  if (HTTPStatusError.is(error)) code = error.status
  if (TelegramError.is(error)) code = error.code
  return code >= 400 && code < 500 && code !== 429
}

function askLoader(url: string, entry: SharedMedia, urgency: Urgency): void {
  entry.pending += 1
  entry.urgency = urgency
  let loading = loadLoaderMedia(url, entry.stop.signal, undefined, urgency)
  if (!loading) {
    entry.reject(new Error(`No loader for ${url}`))
    return
  }
  loading
    .then(response => response.blob())
    .then(entry.resolve, (e: unknown) => {
      entry.pending -= 1
      if (entry.pending > 0) return
      if (
        entry.retried ||
        isMissed(e) ||
        (e instanceof Error && e.name === 'AbortError')
      ) {
        entry.reject(e)
      } else {
        entry.retried = true
        askLoader(url, entry, entry.urgency)
      }
    })
}

function shareMedia(url: string, urgency: Urgency): SharedMedia {
  let { promise, reject, resolve } = Promise.withResolvers<Blob>()
  let entry: SharedMedia = {
    blob: undefined,
    file: promise,
    pending: 0,
    readers: 0,
    reject,
    resolve,
    retried: false,
    saved: false,
    saving: false,
    stop: new AbortController(),
    urgency
  }
  shared.set(url, entry)
  getEnvironment()
    .mediaCache.get(url)
    .then(cached => {
      if (cached) {
        entry.saved = true
        resolve(cached)
      } else {
        entry.stop.signal.throwIfAborted()
        askLoader(url, entry, entry.urgency)
      }
    })
    .catch(reject)
  promise.then(
    blob => {
      entry.blob = blob
      if (entry.readers === 0) restShared(url, entry, blob)
    },
    () => {
      if (shared.get(url) === entry) shared.delete(url)
    }
  )
  return entry
}

function restShared(url: string, entry: SharedMedia, blob: Blob): void {
  if (shared.get(url) !== entry) return
  if (entry.saved) {
    shared.delete(url)
    return
  }
  resting.set(url, blob.size)
  let total = 0
  for (let bytes of resting.values()) total += bytes
  for (let [old, bytes] of resting) {
    if (total <= 32 * 1024 * 1024) break
    resting.delete(old)
    shared.delete(old)
    total -= bytes
  }
}

function leaveShared(url: string, entry: SharedMedia): void {
  entry.readers -= 1
  if (entry.readers > 0) return
  if (entry.blob) {
    restShared(url, entry, entry.blob)
  } else {
    // Loader finishes a download, which is cheaper to finish than to repeat.
    // Its file waits here for the next reader.
    entry.stop.abort()
  }
}

function saveShared(
  url: string,
  entry: SharedMedia,
  keep: boolean,
  blob: Blob
): void {
  if (entry.saved || entry.saving) return
  entry.saving = true
  let saving = keep
    ? getEnvironment()
        .mediaCache.put(url, new Response(blob))
        .then(() => true)
    : savePageCopy(url, blob)
  saving
    .then(
      saved => {
        if (saved) forgetSaved(url)
      },
      (e: unknown) => {
        getEnvironment().warn(e)
      }
    )
    .finally(() => {
      entry.saving = false
    })
}

/**
 * File of the loader from the disk, from the memory, or by one download for
 * everybody, who asked for it. A reader with `signal` keeps the file in
 * the memory until the abort. The loader is told to stop, when all readers
 * left.
 *
 * `keep` saves the file to the disk with any settings, `page` only for posts,
 * which settings keep offline, and `cache` leaves the saving to the caller.
 */
function readShared(
  url: string,
  urgency: Urgency,
  saver: 'cache' | 'keep' | 'page',
  signal?: AbortSignal
): Promise<Blob> {
  if (signal?.aborted) return Promise.reject(signal.reason as Error)
  let entry = shared.get(url)
  if (!entry || (!entry.blob && entry.stop.signal.aborted)) {
    entry = shareMedia(url, urgency)
  }
  if (!entry.blob && isMoreUrgent(urgency, entry.urgency)) {
    if (entry.pending > 0) {
      askLoader(url, entry, urgency)
    } else {
      entry.urgency = urgency
    }
  }
  resting.delete(url)
  entry.readers += 1
  let { promise, reject, resolve } = Promise.withResolvers<Blob>()
  let reader = entry
  function stop(): void {
    leaveShared(url, reader)
    reject(signal!.reason)
  }
  signal?.addEventListener('abort', stop, { once: true })
  reader.file.then(
    blob => {
      if (saver !== 'cache') saveShared(url, reader, saver === 'keep', blob)
      if (!signal) leaveShared(url, reader)
      resolve(blob)
    },
    (e: unknown) => {
      signal?.removeEventListener('abort', stop)
      reject(e)
    }
  )
  return promise
}

function isMoreUrgent(a: Urgency, b: Urgency): boolean {
  return a !== b && (a === 'now' || b === 'later')
}

/**
 * User already paid for the bytes, so the file is kept for offline even
 * in Save Data mode.
 */
export async function cacheMediaOnRequest(
  url: string,
  video = false
): Promise<void> {
  let response = isLoaderMedia(url)
    ? new Response(await readShared(url, 'now', 'cache'))
    : await createDownloadTask({ tries: 1 }).request(url, {
        headers: { Accept: video ? 'video/*' : 'image/*' }
      })
  await getEnvironment().mediaCache.put(url, response)
  forgetSaved(url)
}

/**
 * File for media, which browser can not load by URL on its own, like media
 * with `telegram:` URL. `undefined` for a web URL.
 *
 * `keep` saves the loaded file to the cache with any settings. It is for
 * avatars of feeds and accounts, which are on the screen all the time.
 * Other files are saved only for posts, which settings keep offline.
 *
 * The file stays in the memory until `signal` is aborted, so the same media
 * in another place of the page gets it at once.
 */
export function loadMediaBlob(
  url: string,
  keep = false,
  signal?: AbortSignal,
  urgency: Urgency = 'now'
): Promise<Blob> | undefined {
  if (!isLoaderMedia(url)) return undefined
  return readShared(url, urgency, keep ? 'keep' : 'page', signal)
}

/**
 * URL of the image for an element of this width in device pixels.
 * It is the smallest copy, which is enough for the element. A bigger file,
 * which is already on this device, is taken instead to not download a copy,
 * and smaller ones leave the memory.
 */
export async function chooseMediaCopy(
  media: Pick<PostMedia, 'copies' | 'url'>,
  width: number
): Promise<string> {
  let copies = media.copies ?? []
  if (shared.get(media.url)?.blob || (await isMediaCached(media.url))) {
    for (let copy of copies) forgetUnshown(copy.url)
    return media.url
  }
  let enough = copies
    .filter(copy => copy.width >= width)
    .toSorted((a, b) => a.width - b.width)
  return (enough.find(copy => shared.get(copy.url)?.blob) ?? enough[0] ?? media)
    .url
}

/**
 * Where media is: on the screen, within one screen from it, or further.
 */
export type MediaPlace = 'far' | 'near' | 'screen'

export interface PageMedia {
  blob: Promise<Blob>
  /**
   * Page calls it on every move of media. Nothing is loaded before
   * the first call.
   */
  setPlace(place: MediaPlace): void
}

/**
 * File for media of the page, like `loadMediaBlob()`. Media on the screen
 * is loaded first, then media near the screen, and only then files, which
 * nobody opened, like files for offline. Media far from the screen waits
 * and leaves the queue, when user scrolled it away before the download.
 */
export function loadPageMedia(
  url: string,
  keep: boolean,
  signal: AbortSignal
): PageMedia | undefined {
  if (!isLoaderMedia(url)) return undefined
  let { promise, reject, resolve } = Promise.withResolvers<Blob>()
  let finished = false
  let asked: undefined | Urgency
  let reading = new AbortController()
  signal.addEventListener('abort', () => {
    reading.abort(signal.reason)
    reject(signal.reason)
  })
  promise
    .catch(() => {})
    .finally(() => {
      finished = true
    })
  return {
    blob: promise,
    setPlace(place) {
      if (finished || signal.aborted) return
      if (place === 'far') {
        if (asked) reading.abort()
        asked = undefined
        return
      }
      let urgency: Urgency = place === 'screen' ? 'now' : 'soon'
      if (asked === 'now' || asked === urgency) return
      if (!asked) reading = new AbortController()
      asked = urgency
      let current = reading
      loadMediaBlob(url, keep, current.signal, urgency)!.then(
        resolve,
        (e: unknown) => {
          if (!current.signal.aborted) reject(e)
        }
      )
    }
  }
}

export function stopMediaCache(): void {
  stopped = true
  for (let queue of queues) queue.stop()
}

export async function clearMediaCache(): Promise<void> {
  await getEnvironment().mediaCache.clear()
  let db = getDatabase()
  await createMediaTable(db)
  await db.exec`DELETE FROM "mediaFiles"`
}

/**
 * Files are deleted with the post or its move to the history to free the disk
 * before the next refresh. Other posts and feeds could use the same image.
 */
async function deletePostsMedia(tx: Database, ids: string[]): Promise<void> {
  let list = JSON.stringify(ids)
  await createMediaTable(tx)
  let unused = await tx.select<{ url: string }>`
    SELECT DISTINCT "url" FROM "mediaFiles" AS "deleted"
    WHERE "postId" IN (SELECT "value" FROM json_each(${list}))
      AND "url" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "mediaFiles" AS "other"
        WHERE "other"."url" = "deleted"."url"
          AND "other"."postId" NOT IN (SELECT "value" FROM json_each(${list}))
      )
      AND NOT EXISTS (SELECT 1 FROM "feeds" WHERE "avatar" = "deleted"."url")
  `
  await tx.exec`
    DELETE FROM "mediaFiles"
    WHERE "postId" IN (SELECT "value" FROM json_each(${list}))
  `
  if (unused.length > 0) {
    for (let row of unused) {
      dropped.add(row.url)
      forgetUnshown(row.url)
    }
    void getEnvironment().mediaCache.delete(unused.map(row => row.url))
  }
}

/**
 * Changed post will be parsed again on the next refresh. Files, which it
 * does not need anymore, are deleted there.
 */
async function forgetPostsMedia(tx: Database, ids: string[]): Promise<void> {
  await createMediaTable(tx)
  await tx.exec`
    DELETE FROM "mediaFiles"
    WHERE "postId" IN (SELECT "value" FROM json_each(${JSON.stringify(ids)}))
  `
}

effect(openedDatabase, db => {
  if (!db) return
  let posts = getTables().posts
  let unbinds = [
    posts.on('deleted', deletePostsMedia),
    posts.on('changed', (tx, rows) => {
      let left = rows
        .filter(([, fields]) => fields.read === 2)
        .map(([id]) => id)
      if (left.length > 0) return deletePostsMedia(tx, left)
      let ids = rows
        .filter(([, fields]) => {
          return [
            'author',
            'media',
            'preview',
            'quoted',
            'replied',
            'repostedBy'
          ].some(key => key in fields)
        })
        .map(([id]) => id)
      if (ids.length > 0) return forgetPostsMedia(tx, ids)
    })
  ]
  return () => {
    for (let unbind of unbinds) unbind()
    for (let entry of shared.values()) entry.stop.abort()
    shared.clear()
    resting.clear()
  }
})
