import type { Source } from '../source/index.js'

const TWEET_PATTERN = /^\/[^/]+\/status\/\d+/
const USER_PATTERN = /^\/[^/]+\/?(\?.*)?$/

export const twitter: Source = {
  alwaysUseHttps: true,

  isMineUrl(url) {
    return (
      url.url.hostname === 'twitter.com' &&
      (TWEET_PATTERN.test(url.url.pathname) ||
        USER_PATTERN.test(url.url.pathname))
    )
  }
}
