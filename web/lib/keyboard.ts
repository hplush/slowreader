import type { Attachment } from 'svelte/attachments'
import { on } from 'svelte/events'

/**
 * Adds `is-keyboard` class while on-screen keyboard is open over the element.
 */
export const trackKeyboard: Attachment<HTMLElement> = node => {
  let viewport = window.visualViewport
  if (!viewport) return
  return on(viewport, 'resize', () => {
    node.classList.toggle(
      'is-keyboard',
      // Pinch zoom shrinks visual viewport too
      viewport.scale === 1 &&
        innerHeight - viewport.height > 100 &&
        // Browser scrolls the screen to a field under keyboard by itself
        // and expects to find it at the old place
        viewport.offsetTop === 0 &&
        !!document.activeElement &&
        document.activeElement.getBoundingClientRect().bottom <= viewport.height
    )
  })
}
