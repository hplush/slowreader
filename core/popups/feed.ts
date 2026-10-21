import { atom, onMount } from 'nanostores'

import { getCategories, getCategoryOptions } from '../category.ts'
import { NotFoundError } from '../errors.ts'
import {
  addCandidate,
  changeFeed,
  deleteFeed,
  type FeedValue,
  getFeedsByUrl,
  loadFeedByUrl,
  updateFeedData
} from '../feed.ts'
import { createDownloadTask, type TextResponse } from '../lib/download.ts'
import { waitSql } from '../lib/stores.ts'
import {
  type FeedLoader,
  getLoaderForText,
  tryLoadFeedData
} from '../loader/index.ts'
import { createPostsList, type PostsList } from '../posts-list.ts'
import { addThreadStarts } from '../thread.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

function swapHttpProtocol(url: string): string | undefined {
  try {
    let u = new URL(url)
    u.protocol = u.protocol === 'https:' ? 'http:' : 'https:'
    return u.toString()
  } catch {
    // The user could put anything in the URL hash
    return undefined
  }
}

/**
 * Feed could be saved with another protocol than in the current URL.
 */
async function findFeedUrl(url: string): Promise<string> {
  if (await loadFeedByUrl(url)) return url
  let swapped = swapHttpProtocol(url)
  if (swapped && (await loadFeedByUrl(swapped))) return swapped
  return url
}

export const feed = definePopup('feed', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let feedsStore = getFeedsByUrl(await findFeedUrl(url))
  let categoriesStore = getCategories()
  let downloading = task.text(url)
  let [$feeds] = await Promise.all([
    waitSql(feedsStore),
    waitSql(categoriesStore)
  ])

  let existing = $feeds.get().value[0]
  let response: TextResponse | undefined
  let candidate: false | FeedLoader | undefined

  let parsing = downloading.then(async downloaded => {
    response = downloaded
    candidate = await getLoaderForText(response, task, url)
  })

  if (!existing) {
    await parsing
    // Loader could normalize the URL, like removing the trailing slash
    if (candidate && candidate.url !== url) {
      feedsStore = getFeedsByUrl(candidate.url)
      existing = (await waitSql(feedsStore)).get().value[0]
    }
  }

  let posts: PostsList
  if (existing) {
    posts = createPostsList(async () => {
      await parsing
      if (!candidate || !response) return [[], undefined]
      return addThreadStarts(
        task,
        candidate.loader,
        url,
        candidate.loader.getPosts(task, url, response)
      )()
    })
  } else {
    await parsing
    if (!candidate || !response) throw new NotFoundError()
    posts = createPostsList(
      addThreadStarts(
        task,
        candidate.loader,
        url,
        candidate.loader.getPosts(task, url, response)
      )
    )
    if (posts.get().isLoading) await posts.loading
  }

  let $feed = atom<FeedValue | undefined>()

  let $avatar = atom<string | undefined>()
  // Lazy to not download icons for popups without UI
  onMount($avatar, () => {
    void parsing.then(async () => {
      if (existing) {
        $avatar.set(await updateFeedData(existing.id, response))
      } else if (candidate) {
        let data = await tryLoadFeedData(task, candidate.name, candidate.url, {
          response
        })
        $avatar.set(data?.avatar)
      }
    })
  })

  let unbindFeeds = feedsStore.subscribe(value => {
    if (value.status === 'ready') {
      $feed.set(value.value[0])
    }
  })

  /**
   * Empty title returns the title from the feed’s source.
   */
  async function rename(title: string): Promise<void> {
    let created = $feed.get()
    if (created) {
      await changeFeed(created.id, {
        title: title.trim() || created.originTitle || created.title
      })
    }
  }

  async function remove(): Promise<void> {
    let created = $feed.get()
    if (created) {
      await deleteFeed(created.id)
    }
  }

  async function add(): Promise<string | void> {
    await parsing
    if (candidate) {
      return await addCandidate(
        candidate,
        { avatar: $avatar.get() },
        task,
        response
      )
    }
  }

  return {
    add,
    avatar: $avatar,
    categories: getCategoryOptions(categoriesStore),
    destroy() {
      task.destroy()
      unbindFeeds()
    },
    feed: $feed,
    posts,
    remove,
    rename,
    title: candidate ? candidate.title : ''
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
