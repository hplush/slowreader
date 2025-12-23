import { atom } from 'nanostores'

import { getCategories } from '../category.ts'
import { getEnvironment } from '../environment.ts'
import { NotFoundError } from '../errors.ts'
import { addCandidate, deleteFeed, type FeedValue, getFeeds } from '../feed.ts'
import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { waitSyncLoading } from '../lib/stores.ts'
import { type FeedLoader, getLoaderForText } from '../loader/index.ts'
import { commonMessages } from '../messages/index.ts'
import { createPostsList } from '../posts-list.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

async function loadFeedFromURL(
  task: DownloadTask,
  url: string
): Promise<Error | TextResponse> {
  try {
    return await task.text(url)
  } catch (e) {
    /* node:coverage ignore next 6 */
    if (e instanceof Error) {
      getEnvironment().warn(e)
      return e
    }
    throw e
  }
}

export const feed = definePopup('feed', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let feedsFilter = getFeeds({ url })
  let [responseOrError, categoriesFilter, feeds] = await Promise.all([
    loadFeedFromURL(task, url),
    waitSyncLoading(getCategories()),
    waitSyncLoading(feedsFilter)
  ])

  let existing = feeds.get().list[0]
  let response: TextResponse | undefined

  if (responseOrError instanceof Error) {
    if (!existing) throw new NotFoundError({ cause: responseOrError })
  } else {
    response = responseOrError
  }

  let candidate: false | FeedLoader | undefined
  if (response) {
    candidate = getLoaderForText(response)
  }

  if (!candidate && !existing) throw new NotFoundError()

  let posts
  if (candidate && response) {
    posts = candidate.loader.getPosts(task, url, response)
  } else {
    posts = createPostsList([], undefined)
  }

  let $feed = atom<FeedValue | undefined>()

  let unbindFeed = (): void => {}
  let unbindFeeds = feedsFilter.subscribe(value => {
    if (!value.isLoading) {
      let find = value.list[0]
      if (find) {
        let $find = value.stores.get(find.id)!
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

  async function add(): Promise<string | void> {
    if (candidate) {
      return await addCandidate(candidate, {}, task, response)
    }
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
