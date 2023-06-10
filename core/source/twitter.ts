import type { Source } from '../index.js'

const TWEET_PATTERN = /^\/[^/]+\/status\/\d+/
const USER_PATTERN = /^\/[^/]+\/?(\?.*)?$/

export const twitter: Source = {
  isMineUrl(url) {
    return (
      url.url.hostname === 'twitter.com' &&
      (TWEET_PATTERN.test(url.url.pathname) ||
        USER_PATTERN.test(url.url.pathname))
    )
  }
}
