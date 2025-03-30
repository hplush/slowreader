import { loadValue } from '@logux/client'

import { getFeed, getFeedLatestPosts } from '../feed.ts'
import { definePopup, type LoadedPopup } from './common.ts'

export const feed = definePopup('feed', async id => {
  let $feed = getFeed(id)
  let value = await loadValue($feed)

  if (value) {
    return {
      feed: $feed,
      notFound: false,
      posts: getFeedLatestPosts(value)
    }
  } else {
    return {
      notFound: true
    }
  }
})

export type FeedPopup = LoadedPopup<typeof feed>
