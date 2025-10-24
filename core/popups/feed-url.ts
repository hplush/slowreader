import { atom } from 'nanostores'

import { addCandidate, type FeedValue, getFeeds } from '../feed.ts'
import { createDownloadTask, type TextResponse } from '../lib/download.ts'
import { getLoaderForText } from '../loader/index.ts'
import { NotFoundError } from '../not-found.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const feedUrl = definePopup('feedUrl', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let response: TextResponse
  try {
    response = await task.text(url)
  } catch {
    throw new NotFoundError()
  }

  let search = getLoaderForText(response)
  if (!search) {
    throw new NotFoundError()
  }
  let candidate = search

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

  async function add(): Promise<string> {
    return await addCandidate(candidate, {}, task, response)
  }

  return {
    add,
    destroy() {
      task.destroy()
      unbindFeeds()
      unbindFeed()
    },
    feed: $feed,
    posts
  }
})

export type FeedUrlPopup = CreatedLoadedPopup<typeof feedUrl>
