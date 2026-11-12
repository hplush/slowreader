import { loadMediaBlob } from '@slowreader/core'
import type { Attachment } from 'svelte/attachments'

let observer: IntersectionObserver | undefined

export function pauseVideosWhenScrolledOut(node: Element): () => void {
  observer ??= new IntersectionObserver(entries => {
    for (let entry of entries) {
      if (!entry.isIntersecting) {
        // GIF-like videos have no controls to start them again
        for (let video of entry.target.querySelectorAll<HTMLVideoElement>(
          'video:not([autoplay])'
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

/**
 * Browser can not load media of some our loaders by URL on its own,
 * like `telegram:` URL. We load its file and show it by a local URL.
 * `web` is `false`, when `<source>` tags already have the web URL.
 */
export function mediaSrc(
  url: null | string | undefined,
  attribute: 'poster' | 'src' = 'src',
  web = true
): Attachment<HTMLElement> {
  return element => {
    let loading = url ? loadMediaBlob(url) : undefined
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
        element.setAttribute(attribute, local)
      },
      () => {
        // Components show the broken image by this event
        element.dispatchEvent(new Event('error'))
      }
    )
    return () => {
      removed = true
      if (local) URL.revokeObjectURL(local)
    }
  }
}
