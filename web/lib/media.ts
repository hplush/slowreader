import {
  chooseMediaCopy,
  isLoaderMedia,
  isMediaCached,
  loadLoaderMedia,
  loadMediaBlob,
  loadPageMedia,
  type MediaPlace,
  type PostMedia
} from '@slowreader/core'
import type { Attachment } from 'svelte/attachments'

import type { MediaPart, MediaPartRequest, StreamPath } from '../main/sw.ts'

interface VideoSlot {
  auto: boolean
  controls?(shown: boolean): void
  leave?(): void
  load?(): void
}

let slots = new Map<Element, VideoSlot>()
let shares = new Map<Element, number>()
let dismissed = new WeakSet<Element>()
let started = new WeakSet<HTMLVideoElement>()
let silenced = new WeakSet<HTMLVideoElement>()
let starting: ReturnType<typeof setTimeout> | undefined
let autoloading: Element | undefined
let scope: Element | undefined
let watcher: IntersectionObserver | undefined

function findVideo(node: Element): HTMLVideoElement | null {
  return node instanceof HTMLVideoElement ? node : node.querySelector('video')
}

function pauseSilently(video: HTMLVideoElement): void {
  if (video.paused) return
  started.delete(video)
  silenced.add(video)
  video.pause()
}

function pauseUnpicked(): Element | undefined {
  let videos = [...slots.keys()].map(node => [node, findVideo(node)] as const)
  let picked = videos.some(([, i]) => i && !i.paused && !started.has(i))
    ? undefined
    : [...shares.keys()]
        .toSorted((a, b) => {
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1
        })
        .find(node => {
          return (
            slots.get(node)!.auto &&
            shares.get(node)! >= 0.5 &&
            !dismissed.has(node) &&
            (!scope || scope.contains(node))
          )
        })
  for (let [node, video] of videos) {
    if (video && started.has(video) && node !== picked) pauseSilently(video)
  }
  return picked
}

function startMuted(node: Element, video: HTMLVideoElement): void {
  video.muted = true
  started.add(video)
  // Video without controls would lose the keyboard focus
  if (!node.contains(document.activeElement)) {
    slots.get(node)!.controls?.(false)
  }
  video.play().catch(() => {
    if (started.delete(video)) {
      dismissed.add(node)
      slots.get(node)?.controls?.(true)
    }
  })
}

function autoplay(): void {
  let node = pauseUnpicked()
  if (!node) return
  let video = findVideo(node)
  if (!video) {
    // Loading replaces the button and would lose the keyboard focus
    if (!node.contains(document.activeElement)) {
      autoloading = node
      slots.get(node)!.load?.()
    }
  } else if (video.paused && video.networkState !== video.NETWORK_EMPTY) {
    startMuted(node, video)
  }
}

function reviseVideos(): void {
  if (slots.size === 0) return
  pauseUnpicked()
  // Fast scroll must not start every video on the way
  clearTimeout(starting)
  starting = setTimeout(autoplay, 300)
}

/**
 * Paused video with controls shows the browser’s play button
 * until the next autoplay check.
 */
function startAutoloaded(event: Event): void {
  let node = event.currentTarget as Element
  let video = event.target as HTMLVideoElement
  if (node !== autoloading) {
    reviseVideos()
  } else {
    autoloading = undefined
    if (video.paused) startMuted(node, video)
  }
}

function pauseOthers(event: Event): void {
  for (let node of slots.keys()) {
    let video = findVideo(node)
    if (video && video !== event.target) pauseSilently(video)
  }
}

function dismissPaused(event: Event): void {
  let video = event.target as HTMLVideoElement
  let node = event.currentTarget as Element
  if (!silenced.delete(video)) dismissed.add(node)
  slots.get(node)!.controls?.(true)
  if (started.delete(video) && video.ended) reviseVideos()
}

function findBare(event: Event): HTMLVideoElement | undefined {
  let video = event.target
  return video instanceof HTMLVideoElement &&
    !video.controls &&
    started.has(video)
    ? video
    : undefined
}

/**
 * Browser does not always show the controls, which were returned
 * to a playing video, but always shows them on a paused one.
 */
function pauseBare(event: Event): void {
  findBare(event)?.pause()
}

function returnControlsToMouse(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && findBare(event)) {
    slots.get(event.currentTarget as Element)!.controls?.(true)
  }
}

function keepUnmuted(event: Event): void {
  let video = event.target as HTMLVideoElement
  if (!video.muted) started.delete(video)
}

/**
 * Only one video plays at the same time and only on the screen.
 * With `auto` the upper of videos on the screen is started without sound,
 * and the next one after its end.
 *
 * Browser keeps its controls over a just started video for seconds,
 * so `controls` hides them until the pause or the mouse over the video.
 */
export function watchVideo(slot: VideoSlot): Attachment<HTMLElement> {
  return node => {
    watcher ??= new IntersectionObserver(
      entries => {
        for (let entry of entries) {
          if (!slots.has(entry.target)) continue
          if (entry.isIntersecting) {
            shares.set(
              entry.target,
              entry.intersectionRect.height /
                Math.min(entry.boundingClientRect.height, innerHeight)
            )
          } else {
            shares.delete(entry.target)
            dismissed.delete(entry.target)
            let video = findVideo(entry.target)
            if (video) pauseSilently(video)
            slots.get(entry.target)!.leave?.()
          }
        }
        reviseVideos()
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    let controller = new AbortController()
    let options = { capture: true, signal: controller.signal }
    node.addEventListener('play', pauseOthers, options)
    node.addEventListener('pause', dismissPaused, options)
    node.addEventListener('volumechange', keepUnmuted, options)
    node.addEventListener('loadstart', startAutoloaded, options)
    node.addEventListener('click', pauseBare, options)
    node.addEventListener('pointermove', returnControlsToMouse, options)
    slots.set(node, slot)
    watcher.observe(node)
    return () => {
      controller.abort()
      slots.delete(node)
      shares.delete(node)
      watcher!.unobserve(node)
    }
  }
}

/**
 * For a popup, which takes user’s attention from the page under it.
 */
export const autoplayOnlyInside: Attachment = popup => {
  scope = popup
  for (let node of slots.keys()) {
    let video = findVideo(node)
    if (video && !popup.contains(node)) pauseSilently(video)
  }
  reviseVideos()
  return () => {
    if (scope === popup) scope = undefined
    reviseVideos()
  }
}

export function playIfVisible(video: HTMLVideoElement): void {
  if ([...shares.keys()].some(node => node.contains(video))) {
    video.play().catch(() => {})
  }
}

let streams = new Map<string, { signal: AbortSignal; url: string }>()

async function loadPart(request: MediaPartRequest): Promise<MediaPart> {
  let stream = streams.get(request.token)
  let response = await (stream &&
    loadLoaderMedia(stream.url, stream.signal, request))
  if (!response) return { missing: true }
  return {
    body: await response.arrayBuffer(),
    headers: [...response.headers],
    missing: false,
    status: response.status
  }
}

function answerToPlayer(event: MessageEvent<MediaPartRequest>): void {
  let port = event.ports[0]!
  loadPart(event.data).then(
    part => {
      port.postMessage(part, part.missing ? [] : [part.body])
    },
    () => {
      port.postMessage({ missing: true } satisfies MediaPart)
    }
  )
}

/**
 * Only service worker can give a file to the video player by parts.
 * Dev server and the first visit do not have it.
 */
export function canStreamMedia(): boolean {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller
}

/**
 * Random URL does not tell the post to our server, if the service worker
 * will miss the request, and does not work after the video was closed.
 */
function openStream(url: string, signal: AbortSignal): StreamPath {
  navigator.serviceWorker.addEventListener('message', answerToPlayer)
  let token = crypto.randomUUID()
  streams.set(token, { signal, url })
  signal.addEventListener('abort', () => {
    streams.delete(token)
  })
  return `/stream/${token}`
}

interface View {
  listeners: Set<(place: MediaPlace) => void>
  near: boolean | undefined
  nearby: IntersectionObserver
  seen: boolean | undefined
}

let viewer: IntersectionObserver | undefined
let nearbies = new WeakMap<Element, IntersectionObserver>()
let views = new WeakMap<Element, View>()

function getPlace(view: View): MediaPlace {
  if (view.seen) return 'screen'
  return view.near ? 'near' : 'far'
}

function tellPlace(
  entries: IntersectionObserverEntry[],
  key: 'near' | 'seen'
): void {
  for (let entry of entries) {
    let view = views.get(entry.target)
    if (!view) continue
    view[key] = entry.isIntersecting
    if (view.near === undefined || view.seen === undefined) continue
    for (let listener of view.listeners) listener(getPlace(view))
  }
}

/**
 * Margin around the browser’s window does not reach inside of an element
 * with own scroll, like the page or a popup, so the margin is set on it.
 */
function watchNearby(element: Element): IntersectionObserver {
  let scroller = element.parentElement
  while (
    scroller &&
    !/auto|scroll/.test(getComputedStyle(scroller).overflowY)
  ) {
    scroller = scroller.parentElement
  }
  let nearby = nearbies.get(scroller ?? document.body)
  if (!nearby) {
    nearby = new IntersectionObserver(
      entries => {
        tellPlace(entries, 'near')
      },
      { root: scroller, rootMargin: '100% 0px' }
    )
    nearbies.set(scroller ?? document.body, nearby)
  }
  nearby.observe(element)
  return nearby
}

/**
 * `<video>` has own listeners for the file and for the poster, and the browser
 * tells the current state only to the first of them.
 */
function watchPlace(
  element: Element,
  listener: (place: MediaPlace) => void
): () => void {
  viewer ??= new IntersectionObserver(entries => {
    tellPlace(entries, 'seen')
  })
  let view = views.get(element)
  if (view) {
    view.listeners.add(listener)
    if (view.near !== undefined && view.seen !== undefined) {
      listener(getPlace(view))
    }
  } else {
    view = {
      listeners: new Set([listener]),
      near: undefined,
      nearby: watchNearby(element),
      seen: undefined
    }
    views.set(element, view)
    viewer.observe(element)
  }
  let watched = view
  return () => {
    if (watched.listeners.delete(listener) && watched.listeners.size === 0) {
      views.delete(element)
      viewer!.unobserve(element)
      watched.nearby.unobserve(element)
    }
  }
}

/**
 * Browser can not load media of some our loaders by URL on its own,
 * like `telegram:` URL. We load its file and show it by a local URL.
 * Media on the screen is loaded first, then media within one screen from it.
 * The rest of the page waits for the scroll.
 *
 * `web` is `false`, when `<source>` tags already have the web URL.
 * `keep` saves the file to the cache with any settings, for avatars.
 * `once` forgets the local URL after the image loading, so user can not
 * open the file of a protected post in a new tab.
 * `stream` loads only the watched parts of the video, if the file
 * is not in the cache.
 * `copies` are smaller files of the image. The smallest one, which is enough
 * for the element, is shown, if the device has no file from `url` yet.
 */
export function mediaSrc(
  best: null | string | undefined,
  {
    attribute = 'src',
    copies,
    keep = false,
    once = false,
    stream = false,
    web = true
  }: {
    attribute?: 'poster' | 'src'
    copies?: PostMedia['copies']
    keep?: boolean
    once?: boolean
    stream?: boolean
    web?: boolean
  } = {}
): Attachment<HTMLElement> {
  function show(
    element: HTMLElement,
    url: null | string | undefined
  ): (() => void) | undefined {
    let controller = new AbortController()
    let loading: Promise<Blob | StreamPath> | undefined
    if (url && stream && isLoaderMedia(url) && canStreamMedia()) {
      loading = isMediaCached(url).then<Blob | StreamPath>(cached => {
        controller.signal.throwIfAborted()
        return cached
          ? loadMediaBlob(url, keep, controller.signal)!
          : openStream(url, controller.signal)
      })
    } else if (url) {
      let media = loadPageMedia(url, keep, controller.signal)
      if (media) {
        loading = media.blob
        let unwatch = watchPlace(element, media.setPlace)
        controller.signal.addEventListener('abort', unwatch)
        loading.then(unwatch, unwatch)
      }
    }
    if (!loading) {
      if (web && url) {
        element.setAttribute(attribute, url)
      } else if (web) {
        element.removeAttribute(attribute)
      }
      return undefined
    }
    let local: string | undefined
    let removed = false
    loading.then(
      file => {
        if (removed) return
        local = typeof file === 'string' ? file : URL.createObjectURL(file)
        if (once) {
          element.addEventListener(
            'load',
            () => {
              URL.revokeObjectURL(local!)
            },
            { once: true }
          )
        }
        element.setAttribute(attribute, local)
      },
      () => {
        if (removed) return
        // Components show the broken media by this event
        if (attribute === 'src') element.dispatchEvent(new Event('error'))
      }
    )
    return () => {
      removed = true
      controller.abort()
      if (local) URL.revokeObjectURL(local)
    }
  }

  return element => {
    // Element without known size has no width before the file is loaded
    if (!best || !copies || element.clientWidth === 0) {
      return show(element, best)
    }
    let left = false
    let hide: (() => void) | undefined
    void chooseMediaCopy(
      { copies, url: best },
      element.clientWidth * devicePixelRatio
    )
      .catch(() => best)
      .then(url => {
        if (!left) hide = show(element, url)
      })
    return () => {
      left = true
      hide?.()
    }
  }
}
