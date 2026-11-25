import {
  type ReactedPost,
  trackInterest,
  trackLinkReading
} from '@slowreader/core'
import type { Attachment } from 'svelte/attachments'
import { on } from 'svelte/events'

/**
 * For a post: reading a page opened by its link is reading of the post.
 */
export function trackPostLinks(post: ReactedPost | undefined): Attachment {
  return element => {
    return on(element, 'click', event => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return
      let link = event.target.closest('a')
      if (
        link &&
        link.origin !== location.origin &&
        /^https?:$/.test(link.protocol)
      ) {
        trackLinkReading()
        if (post) trackInterest(post, 'link')
      }
    })
  }
}
