import { getFeed, getFeedLatestPosts } from '../feed.ts'
import { waitSyncLoading } from '../lib/stores.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const feed = definePopup('feed', async id => {
  let $feed = await waitSyncLoading(getFeed(id))
  return {
    destroy() {},
    feed: $feed,
    posts: getFeedLatestPosts($feed.get())
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
