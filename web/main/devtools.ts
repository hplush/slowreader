import { fillFeedsWithPosts } from '@slowreader/core'

declare global {
  interface Window {
    fillFeedsWithPosts?: typeof fillFeedsWithPosts
  }
}

window.fillFeedsWithPosts = fillFeedsWithPosts
