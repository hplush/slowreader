import { atom } from 'nanostores'

import { getEnvironment } from '../environment.ts'
import { addCandidate, deleteFeed, type FeedValue, getFeeds } from '../feed.ts'
import { createDownloadTask, type TextResponse } from '../lib/download.ts'
import { getLoaderForText } from '../loader/index.ts'
import { NotFoundError } from '../not-found.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const feed = definePopup('feed', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let response: TextResponse
  try {
    response = await task.text(url)
  } catch (e) {
    getEnvironment().warn(e)
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
      let find = feeds.list.find(i => i.url === url)
      if (find) {
        let $find = feeds.stores.get(find.id)!
        unbindFeed = $find.subscribe(i => {
          if (!i.isLoading) {
            $feed.set(i)
          }
        })
      } else {
        $feed.set(undefined)
      }
    }
  })

  async function remove(): Promise<void> {
    let created = $feed.get()
    if (created) {
      await deleteFeed(created.id)
    }
  }

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
    posts,
    remove
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
