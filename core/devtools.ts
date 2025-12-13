import { loadValue } from '@logux/client'

import { busyDuring } from './busy.ts'
import { getFeed, getFeedLatestPosts, getFeeds } from './feed.ts'
import { loadFilters } from './filter.ts'
import { createDownloadTask } from './lib/download.ts'
import { loaders } from './loader/index.ts'
import { addPost, deletePost, getPosts, processOriginPost } from './post.ts'
import { router } from './router.ts'

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

/**
 * Show post data in browser DevTools on opening post in popup.
 */
export function enablePostDebug(): void {
  router.subscribe(page => {
    for (let popup of page.popups) {
      if (popup.popup === 'post') {
        let id: string | undefined
        if (popup.param.startsWith('id:')) {
          id = popup.param.slice(3)
        } else if (popup.param.startsWith('read:')) {
          id = popup.param.slice(5)
        }
        if (id) {
          loadValue(getPosts({ id })).then(filter => {
            let post = filter.list[0]!
            loadValue(getFeed(post.feedId)).then(feed => {
              loaders[feed!.loader]
                .getPostSource(feed!, post.originId)
                .then(source => {
                  console.log(post)
                  console.log(source)
                })
            })
          })
        }
      }
    }
  })
}
