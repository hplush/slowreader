import { parseCrdtRows } from '@logux/client/db'
import type { Database } from '@nanostores/sql'
import { atom, computed, effect, map } from 'nanostores'

import { type CachedMedia, getEnvironment } from './environment.ts'
import { HTTPStatusError } from './errors.ts'
import { canDownloadMedia } from './lib/network.ts'
import { createQueue } from './lib/queue.ts'
import { increaseKey } from './lib/stores.ts'
import { changePost, loadPost } from './post.ts'
import {
  getCrdt,
  getDatabase,
  getTables,
  type MediaSize,
  openedDatabase,
  type PostMedia,
  postsTable,
  type PostValue,
  type QuotedPost
} from './schema.ts'
import { cacheImages, cacheMediaReading, cacheVideos } from './settings.ts'

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
 * a row without URL to not be parsed again. Read posts are not skipped,
 * since they are deleted on leaving the reader.
 */
async function findNewPostsMedia(): Promise<void> {
  let db = getDatabase()
  let rows: MediaPostRow[]
  do {
    rows = await getCrdt().select<MediaPostRow>`
      SELECT "posts"."id", "posts"."author", "posts"."media",
        "posts"."mediaSizes", "posts"."preview", "posts"."quoted",
        "posts"."replied", "posts"."repostedBy"
      FROM "posts"
      LEFT JOIN "mediaFiles" ON "mediaFiles"."postId" = "posts"."id"
      WHERE "mediaFiles"."postId" IS NULL
      LIMIT 500
    `
    let parsed = rows.map(row => getTables().posts.parseRow(row))
    await db.transaction(async tx => {
      for (let post of parsed) {
        let files = new Map<string, WantedMedia>()
        addUrl(files, post.author?.avatar, false)
        addUrl(files, post.repostedBy?.avatar, false)
        addUrl(files, post.preview?.image, false)
        addMedia(files, post.media, post.id, 'media')
        addQuoted(files, post.quoted, post.id, 'quoted')
        addQuoted(files, post.replied, post.id, 'replied')
        if (files.size === 0) {
          await tx.exec`INSERT INTO "mediaFiles" ("postId") VALUES (${post.id})`
        }
        for (let [url, file] of files) {
          let video = file.video ? 1 : 0
          if (file.targets.length === 0) {
            await tx.exec`
              INSERT INTO "mediaFiles" ("postId", "url", "video")
              VALUES (${post.id}, ${url}, ${video})
            `
          }
          for (let target of file.targets) {
            await tx.exec`
              INSERT INTO "mediaFiles"
                ("postId", "url", "video", "field", "position")
              VALUES
                (${post.id}, ${url}, ${video}, ${target.field}, ${target.index})
            `
          }
        }
      }
    })
  } while (rows.length === 500)
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

let queue = createQueue<string>([])
let stopped = false

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
  let cache = getEnvironment().mediaCache
  let cached = new Set(await cache.keys())
  let unused = [...cached].filter(url => !wanted.has(url))
  if (unused.length > 0) await cache.delete(unused)

  let downloadImages = canDownloadMedia(images)
  let downloadVideos = canDownloadMedia(videos)
  let missing = [...wanted]
    .filter(([url, item]) => {
      return !cached.has(url) && (item.video ? downloadVideos : downloadImages)
    })
    .map(([url]) => url)
  if (stopped || missing.length === 0) return
  mediaStatistics.set({ ...DEFAULT_MEDIA_STATISTICS, total: missing.length })
  mediaErrors.set([])

  let found: [SizeTarget, CachedMedia][] = []
  queue = createQueue(missing)
  try {
    await queue.start(
      4,
      url => async task => {
        let response: Response
        try {
          // Proxy loads media without the per-host delay by this header
          response = await task.request(url, {
            headers: { Accept: wanted.get(url)!.video ? 'video/*' : 'image/*' }
          })
        } catch (e) {
          // Missed file will not appear on retry, unlike a rate limit
          if (HTTPStatusError.is(e, /^4\d\d$/) && e.status !== 429) {
            failMedia({ error: e, type: 'file', url })
            return
          }
          throw e
        }
        let real = await cache.put(url, response)
        for (let target of wanted.get(url)!.targets) {
          found.push([target, real])
        }
        increaseKey(mediaStatistics, 'done')
      },
      {
        onRequestError() {},
        onTaskFail(url, error) {
          if (error.name === 'QuotaExceededError') {
            queue.stop()
            failMedia({ error, type: 'quota' })
          } else {
            failMedia({ error, type: 'file', url })
          }
        }
      }
    )
  } finally {
    await saveSizes(found)
  }
}

export function stopMediaCache(): void {
  stopped = true
  queue.stop()
}

export async function clearMediaCache(): Promise<void> {
  await getEnvironment().mediaCache.clear()
  let db = getDatabase()
  await createMediaTable(db)
  await db.exec`DELETE FROM "mediaFiles"`
}

/**
 * Files are deleted right with the post to free the disk before the next
 * refresh. Other posts and feeds could use the same avatar or image.
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
  return getCrdt().on('applied', (tx, action) => {
    if (postsTable.deleted.match(action)) {
      return deletePostsMedia(
        tx,
        parseCrdtRows(action).map(([id]) => id)
      )
    } else if (
      postsTable.changed.match(action) &&
      ['author', 'media', 'preview', 'quoted', 'replied', 'repostedBy'].some(
        key => key in action.fields
      )
    ) {
      return forgetPostsMedia(
        tx,
        parseCrdtRows(action).map(([id]) => id)
      )
    }
  })
})
