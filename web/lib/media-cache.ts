import type { CachedMedia, MediaCache } from '@slowreader/core'

import type { MediaCacheName } from '../main/sw.ts'

const MEDIA_CACHE: MediaCacheName = 'slowreader-media'

function readVideoSize(
  blob: Blob
): Promise<{ height: number; width: number } | undefined> {
  let url = URL.createObjectURL(blob)
  let video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  return new Promise<{ height: number; width: number } | undefined>(resolve => {
    video.addEventListener('loadedmetadata', () => {
      resolve({ height: video.videoHeight, width: video.videoWidth })
    })
    video.addEventListener('error', () => {
      resolve(undefined)
    })
    video.src = url
  }).finally(() => {
    video.removeAttribute('src')
    URL.revokeObjectURL(url)
  })
}

async function readSize(blob: Blob): Promise<Omit<CachedMedia, 'bytes'>> {
  try {
    if (blob.type.startsWith('image/')) {
      let bitmap = await createImageBitmap(blob)
      let size = { height: bitmap.height, width: bitmap.width }
      bitmap.close()
      return size
    } else if (blob.type.startsWith('video/')) {
      return (await readVideoSize(blob)) ?? {}
    }
  } catch {}
  return {}
}

export const mediaCache: MediaCache = {
  async clear() {
    await caches.delete(MEDIA_CACHE)
  },
  async delete(urls) {
    let cache = await caches.open(MEDIA_CACHE)
    await Promise.all(urls.map(url => cache.delete(url)))
  },
  async keys() {
    let cache = await caches.open(MEDIA_CACHE)
    return (await cache.keys()).map(request => request.url)
  },
  async put(url, response) {
    let cache = await caches.open(MEDIA_CACHE)
    // Response from the proxy has proxy’s URL and extra headers
    await cache.put(
      url,
      new Response(response.body, {
        headers: {
          'Content-Type':
            response.headers.get('Content-Type') ?? 'application/octet-stream'
        }
      })
    )
    let blob = await (await cache.match(url))!.blob()
    return { bytes: blob.size, ...(await readSize(blob)) }
  },
  async size() {
    let cache = await caches.open(MEDIA_CACHE)
    let sizes = await Promise.all(
      (await cache.matchAll()).map(async response => {
        return (await response.blob()).size
      })
    )
    return sizes.reduce((sum, size) => sum + size, 0)
  }
}
