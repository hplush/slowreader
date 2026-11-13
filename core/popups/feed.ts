import { atom, computed, onMount } from 'nanostores'

import {
  type AccountValue,
  addVirtualFeed,
  canUseAccount,
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
  getFeedCategory,
  getFeedReading,
  getFeedsByUrl,
  loadFeed,
  loadFeedByUrl,
  updateFeedData
} from '../feed.ts'
import { createDownloadTask, type TextResponse } from '../lib/download.ts'
import { waitSql } from '../lib/stores.ts'
import {
  type FeedLoader,
  findFeed,
  hasPersonAvatar,
  type LoaderName,
  loaders,
  tryLoadFeedData
} from '../loader/index.ts'
import { accountsMessages } from '../messages/index.ts'
import { collapseThreads, toPreviewPost } from '../post.ts'
import {
  createPostsList,
  getPostsFrequency,
  type PostsList
} from '../posts-list.ts'
import { loadRecentPosts } from '../refresh.ts'
import type { FeedChanges } from '../schema.ts'
import { addThreadStarts } from '../thread.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

/**
 * Which popup opens a link from post’s text instead of a new tab.
 * `postLoader` is the loader of this post.
 */
export function getLinkPopup(
  text: string,
  url: string,
  postLoader: LoaderName | null | undefined
): 'feed' | 'post' | undefined {
  let parsed = URL.parse(url)
  if (parsed?.protocol !== 'https:') return undefined
  let link = { postLoader: postLoader ?? undefined, text }
  for (let loader of Object.values(loaders)) {
    if (loader.isProfileUrl?.(parsed, link)) return 'feed'
    if (loader.isPostUrl?.(parsed, link)) return 'post'
  }
  return undefined
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
  accounts: AccountValue[],
  url: string
): Promise<AccountValue | undefined> {
  for (let account of accounts) {
    let following: boolean
    try {
      following = await isFollowingByAccount(account, url)
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
  let response: TextResponse | undefined
  let candidate: false | FeedLoader | undefined
  let parsing = findFeed(task, url).then(found => {
    response = found.response
    candidate = found.feed
  })
  let [$feeds] = await Promise.all([
    waitSql(feedsStore),
    waitSql(categoriesStore)
  ])

  let existing = $feeds.get().value[0]

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
      if (!candidate) return [[], undefined]
      return addThreadStarts(
        task,
        candidate.loader,
        url,
        candidate.loader.getPosts(task, url, response)
      )()
    })
  } else {
    await parsing
    if (!candidate) throw new NotFoundError()
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
  let noAnonymous = !!loaders[service].account?.noAnonymous
  let $followedBy = atom<AccountValue | undefined>()
  if (!existing && candidate && accounts.length > 0) {
    $followedBy.set(await findFollowingAccount(accounts, candidate.url))
  }
  let $accountError = atom<string | undefined>()

  /**
   * Follow and unfollow on the service before changing anything locally,
   * since offline the service will keep the old state.
   */
  async function callAccountApi(cb: () => Promise<void>): Promise<boolean> {
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

  let $owner = computed([$feed, $followedBy], (created, followedBy) =>
    created ? accounts.find(i => i.id === created.accountId) : followedBy
  )

  let feedUrl = existing?.url ?? (candidate ? candidate.url : url)

  function replaceSiteByFeedLink(): void {
    if (!response || !candidate) return
    let link = candidate.loader.getSiteUrl?.(response)
    if (link) $site.set(link)
  }

  let profile = hasPersonAvatar(service)
  let $site = atom(profile ? feedUrl : URL.parse(feedUrl)?.origin)
  if (!profile) void parsing.then(replaceSiteByFeedLink, () => {})

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
      loader: candidate.name,
      originTitle: candidate.title,
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

  let $deleting = atom(false)

  async function remove(): Promise<void> {
    let created = $feed.get()
    let followedBy = $followedBy.get()
    let account = accounts.find(i => i.id === created?.accountId) ?? followedBy
    $deleting.set(true)
    try {
      // Follows sync would create the feed again by another account
      let unfollowed = await callAccountApi(async () => {
        if (account) await unfollowByAccount(account, feedUrl)
        for (let other of accounts) {
          if (other === account || other.expired) continue
          if (await isFollowingByAccount(other, feedUrl)) {
            await unfollowByAccount(other, feedUrl)
          }
        }
      })
      if (!unfollowed) return
      if (created) {
        await deleteFeed(created.id)
      } else if (followedBy) {
        await deleteAccountPostsBy(followedBy.id, feedUrl)
        $followedBy.set(undefined)
      }
    } finally {
      $deleting.set(false)
    }
  }

  async function add(): Promise<string | void> {
    await parsing
    let found = candidate
    if (found) {
      let account =
        accounts.find(i => i.follow) ??
        (noAnonymous ? accounts.find(canUseAccount) : undefined)
      if (noAnonymous && !account) {
        $accountError.set(accountsMessages.get().signInOnDevice)
        return
      }
      if (account) {
        let followed = await callAccountApi(() =>
          followByAccount(account, found.url)
        )
        if (!followed) return
      }
      return await addCandidate(
        found,
        { accountId: account?.id, avatar: $avatar.get() },
        createDownloadTask({ cache: 'read' }),
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
    let changed = await callAccountApi(async () => {
      if (next) await followByAccount(next, feedUrl)
      if (prev) await unfollowByAccount(prev, feedUrl)
    })
    if (!changed) return
    created ??= await createVirtualFeed()
    if (!created) return
    let changes: FeedChanges = { accountId: next?.id ?? null }
    if (prev && !next) {
      changes.categoryId = getFeedCategory(created, prev)
      changes.reading = getFeedReading(created, prev)
    }
    await changeFeed(created.id, changes)
    if (next && !prev) {
      await loadRecentPosts(created.id).catch(() => {})
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
    deleting: $deleting,
    destroy() {
      task.destroy()
      unbindFeeds()
    },
    feed: $feed,
    finalUnfollow: !!loaders[service].isFinalUnfollow?.(feedUrl),
    followedBy: $followedBy,
    owner: $owner,
    frequency: computed(posts, () => getPostsFrequency(posts)),
    loader: service,
    noAnonymous,
    posts,
    previews: computed(posts, value =>
      collapseThreads(value.list).map(i => toPreviewPost(i, service))
    ),
    remove,
    reading: computed([$feed, $owner], (created, owner) =>
      getFeedReading(created ?? { reading: null }, owner)
    ),
    rename,
    site: $site,
    title,
    userPostUrl: getUserPostUrls()
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
