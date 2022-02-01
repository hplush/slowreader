import { removeProtocol } from '../utils/index.js'
import { Source } from '../source/index.js'

const TWEET_PATTERN = /^twitter\.com\/[^/]+\/status\/\d+/
const USER_PATTERN = /^twitter\.com\/[^/]+\/?(\?.*)?$/

export const twitter: Source = {
  isMineUrl(dirtyUrl) {
    let trimmed = removeProtocol(dirtyUrl)
    return TWEET_PATTERN.test(trimmed) || USER_PATTERN.test(trimmed)
  }
}
