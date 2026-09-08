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
import {
  createPostsList,
  type PostsList,
  type PostsListResult
} from '../posts-list.ts'
import { GENERAL_CATEGORY } from '../schema.ts'
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
  let downloading = loadFeedFromURL(task, url)
  let [feeds] = await Promise.all([
    waitSql(feedsStore),
    waitSql(categoriesStore)
  ])

  let existing = feeds[0]
  let response: TextResponse | undefined
  let candidate: false | FeedLoader | undefined
  let $error = atom<string | undefined>()

  let parsing = downloading.then(responseOrError => {
    if (responseOrError instanceof Error) {
      $error.set(errorToMessage(responseOrError))
    } else {
      response = responseOrError
      candidate = getLoaderForText(response)
    }
  })

  let posts: PostsList
  if (existing) {
    posts = createPostsList(async () => {
      await parsing
      if (!candidate || !response) return [[], undefined]
      let origin = candidate.loader.getPosts(task, url, response)
      if (origin.get().isLoading) await origin.loading
      let next = async (): Promise<PostsListResult> => {
        let list = await origin.next()
        return [list, origin.get().hasNext ? next : undefined]
      }
      return [origin.get().list, origin.get().hasNext ? next : undefined]
    })
  } else {
    await parsing
    let responseOrError = await downloading
    if (responseOrError instanceof Error) {
      throw new NotFoundError({ cause: responseOrError })
    }
    if (!candidate || !response) throw new NotFoundError()
    posts = candidate.loader.getPosts(task, url, response)
  }

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
      [GENERAL_CATEGORY, commonMessages.get().generalCategory] as [
        string,
        string
      ],
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
    await parsing
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
    error: $error,
    feed: $feed,
    posts,
    remove
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
