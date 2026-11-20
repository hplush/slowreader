import { trackLinkReading } from '@slowreader/core'
import type { Attachment } from 'svelte/attachments'
import { on } from 'svelte/events'

/**
 * For a post: reading a page opened by its link is reading of the post.
 */
export const trackPostLinks: Attachment = post => {
  return on(post, 'click', event => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return
    let link = event.target.closest('a')
    if (
      link &&
      link.origin !== location.origin &&
      /^https?:$/.test(link.protocol)
    ) {
      trackLinkReading()
    }
  })
}
