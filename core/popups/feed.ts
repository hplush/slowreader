import { atom, computed, effect, onMount, type ReadableAtom } from 'nanostores'

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
import {
  errorToMessage,
  HTTPStatusError,
  NotFoundError,
  ParseError
} from '../errors.ts'
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
import {
  formatActivity,
  formatPublishedAt,
  humanizeUrl,
  i18nFormat
} from '../format.ts'
import { addFullTextsToUnread, isAllowedByRobots } from '../full-text.ts'
import {
  createDownloadTask,
  type DownloadTask,
  ignoreAbortError,
  type TextResponse
} from '../lib/download.ts'
import { viewOf, waitSql } from '../lib/stores.ts'
import {
  type FeedLoader,
  findFeed,
  isWebFeed,
  type Loader,
  type LoaderName,
  loaders,
  tryLoadFeedData
} from '../loader/index.ts'
import {
  accountsMessages,
  commonMessages,
  organizeMessages
} from '../messages/index.ts'
import { collapseThreads, type OriginPost, toPreviewPost } from '../post.ts'
import {
  createPostsList,
  getPostsActivity,
  type PostsList,
  type PostsListLoader
} from '../posts-list.ts'
import {
  getFeedReactions,
  getFeedStats,
  type ReactionValue
} from '../reactions.ts'
import { changeReader } from '../reader.ts'
import type { UsefulReaderName } from '../readers/common.ts'
import { loadRecentPosts } from '../refresh.ts'
import type { FeedChanges } from '../schema.ts'
import { addThreadStarts } from '../thread.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'
import { canOpenPostUrl } from './post.ts'

/**
 * Which popup opens a link from post’s text or link preview instead
 * of a new tab. `postLoader` is the loader of this post.
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

type ReactedType = 'disliked' | 'liked' | 'opened'

function getReactedType(reaction: ReactionValue): ReactedType {
  if (reaction.type === 'like') return 'liked'
  if (reaction.type === 'dislike') return 'disliked'
  return 'opened'
}

export const feed = definePopup('feed', async url => {
  let task = createDownloadTask({ cache: 'read' })
  let feedsStore = getFeedsByUrl(await findFeedUrl(url))
  let categoriesStore = getCategories()
  let response: TextResponse | undefined
  let candidate: false | FeedLoader | undefined
  let [$feeds] = await Promise.all([
    waitSql(feedsStore),
    waitSql(categoriesStore)
  ])

  let existing = $feeds.get().value[0]

  let parsing: Promise<void>
  if (existing && !isWebFeed(existing.loader)) {
    // `findFeed()` would lose a saved feed, which the service forgot by this
    // URL, like a Telegram channel after the username change
    candidate = {
      loader: loaders[existing.loader],
      name: existing.loader,
      title: existing.originTitle || existing.title,
      url: existing.url
    }
    parsing = Promise.resolve()
  } else {
    parsing = findFeed(
      task,
      url,
      // Site could change the feed format, so only the document of a saved
      // web feed chooses between its loaders
      existing && {
        names: (Object.keys(loaders) as LoaderName[]).filter(isWebFeed),
        sure: false
      }
    ).then(found => {
      response = found.response
      candidate = found.feed
    })
  }

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
    let loaderData = existing.loaderData
    posts = createPostsList(async () => {
      await parsing
      if (!candidate) throw new ParseError(`No feed at ${url}`)
      return addThreadStarts(
        task,
        candidate.loader,
        url,
        candidate.loader.getPosts(task, url, response, undefined, loaderData)
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

  let $site = atom(isWebFeed(service) ? URL.parse(feedUrl)?.origin : feedUrl)
  if (isWebFeed(service)) void parsing.then(replaceSiteByFeedLink, () => {})

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

  let $extractStatus = atom<
    'blocked' | 'checking' | 'downloading' | 'enabled' | undefined
  >()
  let $extractProgress = atom(0)
  let extracting: DownloadTask | undefined

  async function changeExtract(enabled: boolean): Promise<void> {
    let created = $feed.get()
    if (!created) return
    if (!enabled) {
      extracting?.destroy()
      $extractStatus.set(undefined)
      await changeFeed(created.id, { extract: null })
      return
    }
    $extractStatus.set('checking')
    let urls = posts.get().list.flatMap(post => (post.url ? [post.url] : []))
    let allowed = await isAllowedByRobots(
      task,
      urls.length > 0 ? urls : [created.url]
    )
    if ($extractStatus.get() !== 'checking') return
    if (allowed) {
      await changeFeed(created.id, { extract: true })
      $extractProgress.set(0)
      $extractStatus.set('downloading')
      extracting = createDownloadTask()
      await addFullTextsToUnread(created.id, extracting, value => {
        $extractProgress.set(value)
      })
      if ($extractStatus.get() === 'downloading') $extractStatus.set('enabled')
    } else {
      $extractStatus.set('blocked')
    }
  }

  let $stats = getFeedStats(
    computed($feed, created => (created ? [created.id] : []))
  )

  let $reactions = atom<ReactionValue[]>([])
  let unbindReactions = effect(
    computed($feed, created => created?.id),
    feedId => {
      $reactions.set([])
      if (!feedId) return
      return getFeedReactions(feedId).subscribe(rows => {
        if (rows.status === 'ready') $reactions.set(rows.value)
      })
    }
  )

  let postLoader: Loader = loaders[service]

  function loadPostsByUrls(urls: string[]): PostsListLoader {
    return async () => {
      let page = await Promise.all(
        urls.slice(0, 10).map(async (postUrl): Promise<OriginPost[]> => {
          try {
            let { author, ...post } = await postLoader.getPostByUrl!(
              task,
              postUrl
            )
            // The feed is the author of own posts
            return [author?.url === feedUrl ? post : { ...post, author }]
          } catch (e) {
            // Author deleted the post
            if (HTTPStatusError.is(e, [404, 410])) return []
            throw e
          }
        })
      )
      return [
        page.flat(),
        urls.length > 10 ? loadPostsByUrls(urls.slice(10)) : undefined
      ]
    }
  }

  /**
   * Reacted posts are deleted after reading. Only some services can load
   * them again by URL, 10 posts per page to not hit the rate limits.
   */
  function getReactedPosts(
    type: ReactedType
  ): ReadableAtom<PostsList | undefined> {
    let loaded: string | undefined
    let list: PostsList | undefined
    return computed($reactions, reactions => {
      let urls = reactions.flatMap(reaction => {
        return getReactedType(reaction) === type &&
          reaction.url &&
          canOpenPostUrl(reaction.url)
          ? [reaction.url]
          : []
      })
      // Like of another post should not load the shown posts again
      if (urls.join(' ') !== loaded) {
        loaded = urls.join(' ')
        list =
          urls.length > 0 && postLoader.getPostByUrl
            ? createPostsList(loadPostsByUrls(urls))
            : undefined
      }
      return list
    })
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
    async changeReader(reader: UsefulReaderName): Promise<void> {
      let created = $feed.get()
      if (created) await changeReader({ feedId: created.id }, reader)
    },
    canExtract: isWebFeed(service),
    deleting: $deleting,
    extract: viewOf(
      computed([$feed, $extractStatus], (created, status) => {
        return !!created?.extract || status === 'checking'
      }),
      value => value,
      value => {
        void changeExtract(value).catch(ignoreAbortError)
      }
    ),
    extractProgress: $extractProgress,
    extractStatus: $extractStatus,
    dislikedPosts: getReactedPosts('disliked'),
    destroy() {
      task.destroy()
      unbindFeeds()
      unbindReactions()
    },
    feed: $feed,
    finalUnfollow: !!loaders[service].isFinalUnfollow?.(feedUrl),
    followedBy: $followedBy,
    likedPosts: getReactedPosts('liked'),
    activity: computed(
      [posts, i18nFormat, organizeMessages],
      (_, format, t) => {
        let value = getPostsActivity(posts)
        return value && formatActivity(t, format, value)
      }
    ),
    openedPosts: getReactedPosts('opened'),
    owner: $owner,
    loader: service,
    noAnonymous,
    posts,
    previews: computed(posts, value =>
      collapseThreads(value.list).map(i => toPreviewPost(i, service))
    ),
    remove,
    reactions: computed(
      [$reactions, commonMessages, i18nFormat],
      (reactions, common, format) => {
        return reactions.flatMap(reaction => {
          if (!reaction.url) return []
          return {
            id: reaction.id,
            popup: canOpenPostUrl(reaction.url) ? reaction.url : undefined,
            reactedAt: formatPublishedAt(common, format, reaction.at),
            title: humanizeUrl(reaction.url, service),
            type: getReactedType(reaction),
            url: reaction.url
          }
        })
      }
    ),
    reader: computed($feed, created => created && (created.reader ?? 'feed')),
    reading: computed([$feed, $owner], (created, owner) =>
      getFeedReading(created ?? { reading: null }, owner)
    ),
    rename,
    site: $site,
    stats: computed([$feed, $stats], (created, stats) => {
      return created ? stats.get(created.id) : undefined
    }),

    title,
    userPostUrl: getUserPostUrls()
  }
})

export type FeedPopup = CreatedLoadedPopup<typeof feed>
