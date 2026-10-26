import { atom, onMount } from 'nanostores'

import {
  type AccountValue,
  addVirtualFeed,
  deleteAccountPostsBy,
  followByAccount,
  getUserPostUrls,
  hasAccountPostsBy,
  isAccountService,
  isFollowingByAccount,
  loadAccounts,
  unfollowByAccount
} from '../account.ts'
import { getCategories, getCategoryOptions } from '../category.ts'
import { errorToMessage, NotFoundError } from '../errors.ts'
import {
  addCandidate,
  changeFeed,
  deleteFeed,
  type FeedValue,
  getFeedsByUrl,
  loadFeed,
  loadFeedByUrl,
  updateFeedData
} from '../feed.ts'
import { createDownloadTask, type TextResponse } from '../lib/download.ts'
import { waitSql } from '../lib/stores.ts'
import {
  type FeedLoader,
  getLoaderForText,
  loaders,
  tryLoadFeedData
} from '../loader/index.ts'
import { createPostsList, type PostsList } from '../posts-list.ts'
import { loadRecentPosts } from '../refresh.ts'
import type { FeedChanges } from '../schema.ts'
import { addThreadStarts } from '../thread.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

/**
 * Link text is checked too, because Mastodon’s `/@user` path is used
 * by other sites like Medium, which have no feed on the profile URL.
 */
export function canOpenMention(text: string, url: string): boolean {
  let parsed = URL.parse(url)
  if (!text.trim().startsWith('@') || parsed?.protocol !== 'https:') {
    return false
  }
  return Object.values(loaders).some(i => i.isProfileUrl?.(parsed))
}

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
 * Author without a feed could be followed by user’s account on the service.
 * Offline, refreshed posts of the author tell it.
 */
async function findFollowingAccount(
  task: ReturnType<typeof createDownloadTask>,
  accounts: AccountValue[],
  url: string
): Promise<AccountValue | undefined> {
  for (let account of accounts) {
    let following: boolean
    try {
      following = await isFollowingByAccount(task, account, url)
    } catch {
      following = await hasAccountPostsBy(account.id, url)
    }
    if (following) return account
  }
  return undefined
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

  let service = candidate ? candidate.name : existing?.loader
  if (!service) throw new NotFoundError()
  let accounts = isAccountService(service) ? await loadAccounts(service) : []
  let accountTask = createDownloadTask()
  let $followedBy = atom<AccountValue | undefined>()
  if (!existing && candidate && accounts.length > 0) {
    $followedBy.set(
      await findFollowingAccount(accountTask, accounts, candidate.url)
    )
  }
  let $accountError = atom<string | undefined>()

  /**
   * Follow and unfollow on the service before changing anything locally,
   * since offline the service will keep the old state.
   */
  async function onService(cb: () => Promise<void>): Promise<boolean> {
    $accountError.set(undefined)
    try {
      await cb()
      return true
    } catch (e) {
      $accountError.set(errorToMessage(e))
      return false
    }
  }

  let $feed = atom<FeedValue | undefined>(existing)

  function getAuthorUrl(): string {
    return $feed.get()?.url ?? (candidate ? candidate.url : url)
  }

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
   * Followed author without a feed gets a virtual feed on the first change
   * to keep the changes.
   */
  async function createVirtualFeed(
    changes: FeedChanges = {}
  ): Promise<FeedValue | undefined> {
    let account = $followedBy.get()
    if (!account || !candidate) return undefined
    let feedId = await addVirtualFeed(account, {
      avatar: $avatar.get(),
      categoryId: account.categoryId,
      loader: candidate.name,
      originTitle: candidate.title,
      reading: 'fast',
      title: candidate.title,
      url: candidate.url,
      ...changes
    })
    $followedBy.set(undefined)
    let created = await loadFeed(feedId)
    $feed.set(created)
    return created
  }

  async function change(changes: FeedChanges): Promise<void> {
    let created = $feed.get()
    if (created) {
      await changeFeed(created.id, changes)
    } else {
      await createVirtualFeed(changes)
    }
  }

  /**
   * Empty title returns the title from the feed’s source.
   */
  async function rename(title: string): Promise<void> {
    let created = $feed.get()
    if (created) {
      await changeFeed(created.id, {
        title: title.trim() || created.originTitle || created.title
      })
    } else if (title.trim()) {
      await createVirtualFeed({ title: title.trim() })
    }
  }

  async function remove(): Promise<void> {
    let created = $feed.get()
    let followedBy = $followedBy.get()
    let account = accounts.find(i => i.id === created?.accountId) ?? followedBy
    if (account) {
      let unfollowed = await onService(() =>
        unfollowByAccount(accountTask, account, getAuthorUrl())
      )
      if (!unfollowed) return
    }
    if (created) {
      await deleteFeed(created.id)
    } else if (followedBy) {
      await deleteAccountPostsBy(followedBy.id, getAuthorUrl())
      $followedBy.set(undefined)
    }
  }

  async function add(): Promise<string | void> {
    await parsing
    let found = candidate
    if (found) {
      let account = accounts.find(i => i.follow)
      if (account) {
        let followed = await onService(() =>
          followByAccount(accountTask, account, found.url)
        )
        if (!followed) return
      }
      return await addCandidate(
        found,
        { accountId: account?.id, avatar: $avatar.get() },
        task,
        response
      )
    }
  }

  /**
   * Account → Anonymous refreshes the feed by itself. Account A → B follows
   * by B first, so the error will keep the author followed by A.
   */
  async function changeAccount(accountId: string | undefined): Promise<void> {
    let created = $feed.get()
    let prev = accounts.find(
      i => i.id === (created ? created.accountId : $followedBy.get()?.id)
    )
    let next = accounts.find(i => i.id === accountId)
    if (prev === next) return
    let target = getAuthorUrl()
    let changed = await onService(async () => {
      if (next) await followByAccount(accountTask, next, target)
      if (prev) await unfollowByAccount(accountTask, prev, target)
    })
    if (!changed) return
    created ??= await createVirtualFeed()
    if (!created) return
    await changeFeed(created.id, { accountId: next?.id ?? null })
    if (next && !prev) {
      await loadRecentPosts(created.id, accountTask).catch(() => {})
    }
  }

  let title = ''
  if (existing) {
    title = existing.originTitle || existing.title
  } else if (candidate) {
    title = candidate.title
  }

  return {
    accountError: $accountError,
    accounts,
    add,
    avatar: $avatar,
    categories: getCategoryOptions(categoriesStore),
    change,
    changeAccount,
    destroy() {
      task.destroy()
      accountTask.destroy()
      unbindFeeds()
    },
    feed: $feed,
    followedBy: $followedBy,
    loader: service,
    posts,
    remove,
    rename,
    title,
    userPostUrl: getUserPostUrls()
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
