import { loadMediaBlob } from '@slowreader/core'
import type { Attachment } from 'svelte/attachments'

let observer: IntersectionObserver | undefined

export function pauseVideosWhenScrolledOut(node: Element): () => void {
  observer ??= new IntersectionObserver(entries => {
    for (let entry of entries) {
      if (!entry.isIntersecting) {
        // Looped GIF-like videos have no controls to start them again
        for (let video of entry.target.querySelectorAll<HTMLVideoElement>(
          'video:not([loop])'
        )) {
          video.pause()
        }
      }
    }
  })
  observer.observe(node)
  return () => {
    observer?.unobserve(node)
  }
}

export function playIfVisible(video: HTMLVideoElement): void {
  let visibility = new IntersectionObserver(([entry]) => {
    visibility.disconnect()
    if (entry?.isIntersecting) video.play().catch(() => {})
  })
  visibility.observe(video)
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
