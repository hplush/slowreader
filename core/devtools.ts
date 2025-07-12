import { loadValue } from '@logux/client'

import { busyDuring } from './busy.ts'
import { createDownloadTask } from './download.ts'
import { getFeedLatestPosts, getFeeds } from './feed.ts'
import { loadFilters } from './filter.ts'
import { addPost, deletePost, getPosts, processOriginPost } from './post.ts'

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
