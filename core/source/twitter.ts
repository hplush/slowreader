import type { Source } from '../index.js'

const TWEET_PATTERN = /^\/[^/]+\/status\/\d+/
const USER_PATTERN = /^\/[^/]+\/?(\?.*)?$/

export const twitter: Source = {
  getMineLinksFromText() {
    return []
  },

  isMineText() {
    return false
  },

  isMineUrl(url) {
    if (
      url.hostname === 'twitter.com' &&
      (TWEET_PATTERN.test(url.pathname) || USER_PATTERN.test(url.pathname))
    ) {
      let username = url.pathname.split('/')[1]
      return `@${username}`
    } else {
      return false
    }
  }
}
