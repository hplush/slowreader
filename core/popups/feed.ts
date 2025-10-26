import { atom } from 'nanostores'

import { getCategories } from '../category.ts'
import { getEnvironment } from '../environment.ts'
import { addCandidate, deleteFeed, type FeedValue, getFeeds } from '../feed.ts'
import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { waitSyncLoading } from '../lib/stores.ts'
import { getLoaderForText } from '../loader/index.ts'
import { commonMessages } from '../messages/index.ts'
import { NotFoundError } from '../not-found.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

async function loadFeedFromURL(
  task: DownloadTask,
  url: string
): Promise<TextResponse> {
  try {
    return await task.text(url)
  } catch (e) {
    getEnvironment().warn(e)
    throw new NotFoundError()
  }
}

export const feed = definePopup('feed', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let [response, categoriesFilter] = await Promise.all([
    loadFeedFromURL(task, url),
    waitSyncLoading(getCategories())
  ])

  let search = getLoaderForText(response)
  if (!search) throw new NotFoundError()
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

  let $categories = atom<[string, string][]>([])
  let unbindCategories = categoriesFilter.subscribe(value => {
    let list = value.list.map(
      category => [category.id, category.title] as [string, string]
    )
    $categories.set([
      ['general', commonMessages.get().generalCategory] as [string, string],
      ...list,
      ['new', commonMessages.get().addCategory] as [string, string]
    ])
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
    categories: $categories,
    destroy() {
      task.destroy()
      unbindFeeds()
      unbindFeed()
      unbindCategories()
    },
    feed: $feed,
    posts,
    remove
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
