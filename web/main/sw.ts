// Service worker for offline support.

// scripts/generate-manifest.ts replaces them after the build
declare const SW_ASSETS: Record<string, string>
declare const SW_COMMIT: string
declare const SW_ROUTES: RegExp

export type ToServiceWorker = 'skipWaiting'

// Caches of old versions are deleted, but not this one
const MEDIA_CACHE = 'slowreader-media'

export type MediaCacheName = typeof MEDIA_CACHE

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

interface FetchEvent extends Event {
  request: Request
  respondWith(response: Promise<Response>): void
}

interface ServiceWorkerScope {
  addEventListener(
    type: 'activate' | 'install',
    listener: (event: ExtendableEvent) => void
  ): void
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<ToServiceWorker>) => void
  ): void
  clients: { claim(): Promise<void> }
  skipWaiting(): Promise<void>
}

let worker = self as unknown as ServiceWorkerScope
let assets = SW_ASSETS
let commit = SW_COMMIT

async function fromCache(url: string): Promise<Response> {
  let cache = await caches.open(commit)
  return (await cache.match(url)) ?? fetch(url)
}

/**
 * Media player asks for parts of the video to seek it.
 */
async function sliceRange(
  cached: Response,
  range: string | null
): Promise<Response> {
  let match = range?.match(/^bytes=(\d+)-(\d*)$/)
  if (!match) return cached
  let blob = await cached.blob()
  let start = Number(match[1])
  let end = match[2] ? Math.min(Number(match[2]) + 1, blob.size) : blob.size
  if (start >= blob.size) {
    return new Response(null, {
      headers: { 'Content-Range': `bytes */${blob.size}` },
      status: 416
    })
  }
  return new Response(blob.slice(start, end), {
    headers: {
      'Content-Length': String(end - start),
      'Content-Range': `bytes ${start}-${end - 1}/${blob.size}`,
      'Content-Type': cached.headers.get('Content-Type') ?? ''
    },
    status: 206
  })
}

async function fromMediaCache(request: Request): Promise<Response> {
  let cache = await caches.open(MEDIA_CACHE)
  let cached = await cache.match(request.url)
  if (!cached) return fetch(request)
  return sliceRange(cached, request.headers.get('Range'))
}

function isAppRoute(path: string): boolean {
  try {
    // nginx tests decoded path with merged slashes
    return SW_ROUTES.test(decodeURIComponent(path).replace(/\/{2,}/g, '/'))
  } catch {
    return false
  }
}

worker.addEventListener('install', event => {
  event.waitUntil(
    caches.open(commit).then(cache =>
      Promise.all(
        Object.entries(assets).map(async ([url, integrity]) => {
          // The next install attempt continues the download. A rebuild
          // of the same commit can change only files without hash in name.
          if (/^\/(assets|landing)\//.test(url) && (await cache.match(url))) {
            return
          }
          let response = await fetch(url, { cache: 'no-cache', integrity })
          if (!response.ok) throw new Error(`${url} ${response.status}`)
          await cache.put(url, response)
        })
      )
    )
  )
})

worker.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(async names => {
      await Promise.all(
        names
          .filter(i => i !== commit && i !== MEDIA_CACHE)
          .map(i => caches.delete(i))
      )
      await worker.clients.claim()
    })
  )
})

worker.addEventListener('fetch', event => {
  let { request } = event
  let url = new URL(request.url)
  if (request.method !== 'GET') return
  if (url.origin !== location.origin) {
    if (request.destination === 'image' || request.destination === 'video') {
      event.respondWith(fromMediaCache(request))
    }
    return
  }
  let navigate = request.mode === 'navigate'
  if (navigate && url.pathname === '/') {
    // Landing or self-hosted app, which only the server knows
    event.respondWith(fetch(request).catch(() => fromCache('/app.html')))
  } else if (assets[url.pathname]) {
    event.respondWith(fromCache(url.pathname))
  } else if (navigate && isAppRoute(url.pathname)) {
    event.respondWith(fromCache('/app.html'))
  }
})

worker.addEventListener('message', event => {
  if (event.data === 'skipWaiting') void worker.skipWaiting()
})
