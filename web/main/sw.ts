// Service worker for offline support.

// scripts/generate-manifest.ts replaces them after the build
declare const SW_ASSETS: Record<string, string>
declare const SW_COMMIT: string
declare const SW_LAZY_ASSETS: Record<string, string>
declare const SW_ROUTES: RegExp

export type ToServiceWorker = 'skipWaiting'

export type StreamPath = `/stream/${string}`

export interface MediaPartRequest {
  end: number
  start: number
  token: string
}

export type MediaPart =
  | {
      body: ArrayBuffer
      headers: [string, string][]
      missing: false
      status: number
    }
  | { missing: true }

// Caches of old versions are deleted, but not this one
const MEDIA_CACHE = 'slowreader-media'

export type MediaCacheName = typeof MEDIA_CACHE

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

interface FetchEvent extends Event {
  clientId: string
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
  clients: {
    claim(): Promise<void>
    get(id: string): Promise<
      | {
          postMessage(message: MediaPartRequest, transfer: Transferable[]): void
        }
      | undefined
    >
  }
  registration: { installing: unknown; waiting: unknown }
  skipWaiting(): Promise<void>
}

let worker = self as unknown as ServiceWorkerScope
let assets = SW_ASSETS
let commit = SW_COMMIT
// Big files only for part of users, like Telegram’s library
let lazyAssets = SW_LAZY_ASSETS

async function fromCache(url: string, search = ''): Promise<Response> {
  let cache = await caches.open(commit)
  let cached = await cache.match(url)
  // Worker takes its location from the response URL, and SQLite’s OPFS
  // worker needs the query of the request there
  if (cached) return new Response(cached.body, cached)
  try {
    let response = await fetch(url + search, { integrity: assets[url] })
    if (response.ok) await cache.put(url, response.clone())
    return response
  } catch {
    // Server can already have the next version of a file without hash in name
    return fetch(url + search)
  }
}

async function fromCacheOrSave(url: string): Promise<Response> {
  let cache = await caches.open(commit)
  // Firefox blocks fromCache() response without URL in Telegram worker,
  // because its CSP has a path in connect-src
  let cached = await cache.match(url)
  if (cached) return cached
  let response = await fetch(url, { integrity: lazyAssets[url] })
  if (response.ok) await cache.put(url, response.clone())
  return response
}

/**
 * App update should not make user download megabytes again. Only names
 * in `/assets/` have a hash of the content, so the same URL is the same file.
 */
async function keepLazyAssets(old: string[]): Promise<void> {
  let cache = await caches.open(commit)
  await Promise.all(
    old.map(async name => {
      let previous = await caches.open(name)
      await Promise.all(
        Object.keys(lazyAssets)
          .filter(url => url.startsWith('/assets/'))
          .map(async url => {
            let cached = await previous.match(url)
            if (cached) await cache.put(url, cached)
          })
      )
    })
  )
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

/**
 * Video of some loaders has no web URL and only the page can load its file.
 * Player asks for the whole rest of the file even to show the first frame,
 * so it gets a small part and asks for the next one, when it needs it.
 */
async function fromPage(event: FetchEvent, token: string): Promise<Response> {
  let range = /^bytes=(\d+)-(\d*)$/.exec(
    event.request.headers.get('Range') ?? ''
  )
  let client = await worker.clients.get(event.clientId)
  if (!range || !client) return new Response(null, { status: 404 })
  let start = Number(range[1])
  let channel = new MessageChannel()
  let part = await new Promise<MediaPart>(resolve => {
    channel.port1.addEventListener(
      'message',
      (answer: MessageEvent<MediaPart>) => {
        resolve(answer.data)
      },
      { once: true }
    )
    channel.port1.start()
    client.postMessage(
      {
        end: Math.min(Number(range[2] || Infinity), start + 512 * 1024 - 1),
        start,
        token
      },
      [channel.port2]
    )
  })
  if (part.missing) return new Response(null, { status: 404 })
  return new Response(part.body, {
    headers: [
      ...part.headers,
      ['Content-Length', String(part.body.byteLength)]
    ],
    status: part.status
  })
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
      let old = names.filter(i => i !== commit && i !== MEDIA_CACHE)
      await keepLazyAssets(old)
      // Deleted cache still takes files without an error, so the version,
      // which is installing now, would start with an empty cache
      if (!worker.registration.installing && !worker.registration.waiting) {
        await Promise.all(old.map(i => caches.delete(i)))
      }
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
  if (
    request.destination === 'video' &&
    url.pathname.startsWith('/stream/' satisfies StreamPath)
  ) {
    event.respondWith(fromPage(event, url.pathname.slice(8)))
  } else if (navigate && url.pathname === '/') {
    // Landing or self-hosted app, which only the server knows
    event.respondWith(fetch(request).catch(() => fromCache('/app.html')))
  } else if (assets[url.pathname]) {
    event.respondWith(fromCache(url.pathname, url.search))
  } else if (lazyAssets[url.pathname]) {
    event.respondWith(fromCacheOrSave(url.pathname))
  } else if (navigate && isAppRoute(url.pathname)) {
    event.respondWith(fromCache('/app.html'))
  }
})

worker.addEventListener('message', event => {
  if (event.data === 'skipWaiting') void worker.skipWaiting()
})
