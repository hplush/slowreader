import { atom } from 'nanostores'

import { createDownloadTask } from '../download.ts'
import { type FeedValue, getFeeds } from '../feed.ts'
import { getLoaderForText } from '../loader/index.ts'
import { NotFoundError } from '../not-found.ts'
import { definePopup, type LoadedPopup } from './common.ts'

export const feedUrl = definePopup('feedUrl', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let response = await task.text(url)

  let candidate = getLoaderForText(response)
  if (!candidate) {
    throw new NotFoundError()
  }

  let posts = candidate.loader.getPosts(task, url, response)
  let $feed = atom<FeedValue | undefined>()

  let feedsFilter = getFeeds({ url })
  let unbindFeed = (): void => {}
  let unbindFeeds = feedsFilter.subscribe(feeds => {
    if (!feeds.isLoading) {
      let needed = feeds.list.find(feed => feed.url === url)
      if (needed) {
        let $needed = feeds.stores.get(needed.id)!
        unbindFeed = $needed.subscribe(feed => {
          if (!feed.isLoading) {
            $feed.set(feed)
          }
        })
      } else {
        $feed.set(undefined)
      }
    }
  })

  return {
    destroy() {
      task.destroy()
      unbindFeeds()
      unbindFeed()
    },
    feed: $feed,
    posts
  }
})

export type FeedUrlPopup = LoadedPopup<typeof feedUrl>
