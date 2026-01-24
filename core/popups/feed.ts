import type { FilterStore } from '@logux/client'
import { atom } from 'nanostores'

import { getCategories } from '../category.ts'
import { getEnvironment } from '../environment.ts'
import { errorToMessage, NotFoundError } from '../errors.ts'
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

function swapHttpProtocol(url: string): string {
  let u = new URL(url)
  u.protocol = u.protocol === 'https:' ? 'http:' : 'https:'
  return u.toString()
}

async function getFeedFilter(url: string): Promise<FilterStore<FeedValue>> {
  let exactFilter = getFeeds({ url })
  let feeds = await waitSyncLoading(exactFilter)

  if (feeds.get().list.length === 0) {
    let fallbackFilter = getFeeds({ url: swapHttpProtocol(url) })
    feeds = await waitSyncLoading(fallbackFilter)
    if (feeds.get().list.length > 0) {
      return fallbackFilter
    }
  }

  return exactFilter
}

export const feed = definePopup('feed', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let feedsFilter = await getFeedFilter(url)
  let error: string | undefined
  let [responseOrError, categoriesFilter, feeds] = await Promise.all([
    loadFeedFromURL(task, url),
    waitSyncLoading(getCategories()),
    waitSyncLoading(feedsFilter)
  ])

  let existing = feeds.get().list[0]
  let response: TextResponse | undefined
  let candidate: false | FeedLoader | undefined
  let posts = createPostsList(undefined)

  if (responseOrError instanceof Error) {
    error = errorToMessage(responseOrError)
    if (!existing) throw new NotFoundError({ cause: responseOrError })
  } else {
    response = responseOrError
    candidate = getLoaderForText(response)
    if (candidate) posts = candidate.loader.getPosts(task, url, response)
  }

  if (!candidate && !existing) throw new NotFoundError()

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
    error,
    feed: $feed,
    posts,
    remove
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
