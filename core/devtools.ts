import { busyDuring } from './busy.js'
import { createDownloadTask } from './download.js'
import { getFeedLatestPosts, loadFeeds } from './feed.js'
import { loadFilters, prepareFilters } from './filter.js'
import { addPost, deletePost, loadPosts, processOriginPost } from './post.js'

export async function fillFeedsWithPosts(): Promise<void> {
  await busyDuring(async () => {
    let task = createDownloadTask()
    let feeds = await loadFeeds()
    await Promise.all(
      feeds.map(async feed => {
        let old = await loadPosts({ feedId: feed.id })
        for (let post of old) {
          await deletePost(post.id)
        }
        let posts = await getFeedLatestPosts(feed, task).nextPage()
        let filters = prepareFilters(await loadFilters({ feedId: feed.id }))
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

let warnings = false

export function enableWarnings(mode = true): void {
  warnings = mode
}

export function warning(...args: unknown[]): void {
  if (warnings) {
    // eslint-disable-next-line no-console
    console.warn(...args)
  }
}
