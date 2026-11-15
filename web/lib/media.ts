import { loadMediaBlob } from '@slowreader/core'
import type { Attachment } from 'svelte/attachments'

interface VideoSlot {
  auto: boolean
  leave?(): void
  load?(): void
}

let slots = new Map<Element, VideoSlot>()
let shares = new Map<Element, number>()
let dismissed = new WeakSet<Element>()
let started = new WeakSet<HTMLVideoElement>()
let silenced = new WeakSet<HTMLVideoElement>()
let starting: ReturnType<typeof setTimeout> | undefined
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

function autoplay(): void {
  let node = pauseUnpicked()
  if (!node) return
  let video = findVideo(node)
  if (!video) {
    // Loading replaces the button and would lose the keyboard focus
    if (!node.contains(document.activeElement)) slots.get(node)!.load?.()
  } else if (video.paused && video.networkState !== video.NETWORK_EMPTY) {
    video.muted = true
    started.add(video)
    video.play().catch(() => {
      if (started.delete(video)) dismissed.add(node)
    })
  }
}

function reviseVideos(): void {
  if (slots.size === 0) return
  pauseUnpicked()
  // Fast scroll must not start every video on the way
  clearTimeout(starting)
  starting = setTimeout(autoplay, 300)
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
  started.delete(video)
  if (!silenced.delete(video)) dismissed.add(node)
}

function keepUnmuted(event: Event): void {
  let video = event.target as HTMLVideoElement
  if (!video.muted) started.delete(video)
}

/**
 * Only one video plays at the same time and only on the screen.
 * With `auto` the upper of videos on the screen is started without sound.
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
    node.addEventListener('loadstart', reviseVideos, options)
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

/**
 * Browser can not load media of some our loaders by URL on its own,
 * like `telegram:` URL. We load its file and show it by a local URL.
 *
 * `web` is `false`, when `<source>` tags already have the web URL.
 * `keep` saves the file to the cache with any settings, for avatars.
 * `once` forgets the local URL after the image loading, so user can not
 * open the file of a protected post in a new tab.
 */
export function mediaSrc(
  url: null | string | undefined,
  {
    attribute = 'src',
    keep = false,
    once = false,
    web = true
  }: {
    attribute?: 'poster' | 'src'
    keep?: boolean
    once?: boolean
    web?: boolean
  } = {}
): Attachment<HTMLElement> {
  return element => {
    let controller = new AbortController()
    let loading = url ? loadMediaBlob(url, keep, controller.signal) : undefined
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
      blob => {
        if (removed) return
        local = URL.createObjectURL(blob)
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
}
