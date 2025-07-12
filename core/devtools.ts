import { loadValue } from '@logux/client'

import { busyDuring } from './busy.ts'
import { getFeedLatestPosts, getFeeds } from './feed.ts'
import { loadFilters } from './filter.ts'
import { createDownloadTask } from './lib/download.ts'
import { addPost, deletePost, getPosts, processOriginPost } from './post.ts'

/**
 * Create test feeds and posts for new client.
 */
export async function fillFeedsWithPosts(): Promise<void> {
  await busyDuring(async () => {
    let task = createDownloadTask()
    let feeds = await loadValue(getFeeds())
    await Promise.all(
      feeds.list.map(async feed => {
        let old = await loadValue(getPosts({ feedId: feed.id }))
        for (let post of old.list) {
          await deletePost(post.id)
        }
        let posts = await getFeedLatestPosts(feed, task).next()
        let filters = await loadFilters({ feedId: feed.id })
        for (let origin of posts) {
          let reading = filters(origin) ?? feed.reading
          if (reading !== 'delete') {
            await addPost(processOriginPost(origin, feed.id, reading))
          }
        }
      })
    )
  })
}
