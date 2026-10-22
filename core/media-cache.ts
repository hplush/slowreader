import { atom, computed, map } from 'nanostores'

import { type CachedMedia, getEnvironment } from './environment.ts'
import { HTTPStatusError } from './errors.ts'
import { canDownloadMedia } from './lib/network.ts'
import { createQueue } from './lib/queue.ts'
import { increaseKey } from './lib/stores.ts'
import { changePost } from './post.ts'
import {
  getCrdt,
  getTables,
  type MediaSize,
  type PostMedia,
  type PostValue,
  type QuotedPost
} from './schema.ts'
import { cacheImages, cacheVideos } from './settings.ts'

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
  videos: boolean,
  media: null | PostMedia[] | undefined,
  postId: string,
  field: SizedField
): void {
  for (let [index, item] of (media ?? []).entries()) {
    addUrl(wanted, item.poster, false)
    if (item.type.startsWith('image')) {
      addUrl(wanted, item.url, false, { field, index, postId })
    } else if (item.type.startsWith('video') && videos) {
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
  videos: boolean,
  quoted: null | QuotedPost | undefined,
  postId: string,
  field: 'quoted' | 'replied'
): void {
  if (!quoted) return
  addUrl(wanted, quoted.author?.avatar, false)
  addUrl(wanted, quoted.preview?.image, false)
  addMedia(wanted, videos, quoted.media, postId, field)
}

/**
 * Media of posts and feed avatars, the newest first. Read posts are
 * not skipped, since they are deleted on leaving the reader.
 */
async function loadWantedMedia(
  images: boolean,
  videos: boolean
): Promise<{
  posts: Map<string, MediaPostRow>
  wanted: Map<string, WantedMedia>
}> {
  let wanted = new Map<string, WantedMedia>()
  let posts = new Map<string, MediaPostRow>()
  if (!images && !videos) return { posts, wanted }

  let feeds = await getCrdt().select<{ avatar: string }>`
    SELECT "avatar" FROM "feeds" WHERE "avatar" IS NOT NULL
  `
  for (let feed of feeds) addUrl(wanted, feed.avatar, false)

  let rows = await getCrdt().select<MediaPostRow>`
    SELECT "id", "author", "media", "mediaSizes", "preview", "quoted",
      "replied", "repostedBy"
    FROM "posts"
    ORDER BY "sortedAt" DESC
  `
  for (let row of rows) {
    let post = getTables().posts.parseRow(row)
    posts.set(post.id, post)
    addUrl(wanted, post.author?.avatar, false)
    addUrl(wanted, post.repostedBy?.avatar, false)
    addUrl(wanted, post.preview?.image, false)
    addMedia(wanted, videos, post.media, post.id, 'media')
    addQuoted(wanted, videos, post.quoted, post.id, 'quoted')
    addQuoted(wanted, videos, post.replied, post.id, 'replied')
  }

  if (!images) {
    for (let [url, item] of wanted) {
      if (!item.video) wanted.delete(url)
    }
  }
  return { posts, wanted }
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
async function saveSizes(
  posts: Map<string, MediaPostRow>,
  found: [SizeTarget, CachedMedia][]
): Promise<void> {
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
  for (let [id, post] of changed) {
    let original = posts.get(id)!
    await changePost(id, {
      ...(post.mediaSizes !== original.mediaSizes && {
        mediaSizes: post.mediaSizes
      }),
      ...(post.quoted !== original.quoted && { quoted: post.quoted }),
      ...(post.replied !== original.replied && { replied: post.replied })
    })
  }
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
  let images = cacheImages.get()
  let videos = cacheVideos.get()
  let { posts, wanted } = await loadWantedMedia(
    images !== 'never',
    videos !== 'never'
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
          if (HTTPStatusError.is(e) && e.status < 500 && e.status !== 429) {
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
    await saveSizes(posts, found)
  }
}

export function stopMediaCache(): void {
  stopped = true
  queue.stop()
}

export function clearMediaCache(): Promise<void> {
  return getEnvironment().mediaCache.clear()
}
