import { atom } from 'nanostores'

import { getCategories } from '../category.ts'
import { getEnvironment } from '../environment.ts'
import { errorToMessage, NotFoundError } from '../errors.ts'
import {
  addCandidate,
  deleteFeed,
  type FeedValue,
  getFeedsByUrl,
  loadFeedByUrl
} from '../feed.ts'
import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { waitSql } from '../lib/stores.ts'
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

/**
 * Feed could be saved with another protocol than in the current URL.
 */
async function findFeedUrl(url: string): Promise<string> {
  if (await loadFeedByUrl(url)) return url
  let swapped = swapHttpProtocol(url)
  if (await loadFeedByUrl(swapped)) return swapped
  return url
}

export const feed = definePopup('feed', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let feedsStore = getFeedsByUrl(await findFeedUrl(url))
  let categoriesStore = getCategories()
  let error: string | undefined
  let [responseOrError, feeds] = await Promise.all([
    loadFeedFromURL(task, url),
    waitSql(feedsStore),
    waitSql(categoriesStore)
  ])

  let existing = feeds[0]
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

  let unbindFeeds = feedsStore.subscribe(value => {
    if (!value.isLoading) {
      $feed.set(value.value[0])
    }
  })

  let $categories = atom<[string, string][]>([])
  let unbindCategories = categoriesStore.subscribe(value => {
    if (value.isLoading) return
    let list = value.value.map(
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
      unbindCategories()
    },
    error,
    feed: $feed,
    posts,
    remove
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
