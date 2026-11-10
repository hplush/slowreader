import type { SqlStore, SqlStoreValue } from '@nanostores/sql'
import { delay } from 'nanodelay'
import { computed, type ReadableAtom } from 'nanostores'

import { getClient, onClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import {
  errorToMessage,
  isRemoteError,
  NetworkError,
  UserFacingError
} from './errors.ts'
import { addFeed, deleteFeed, type FeedValue, type NewFeed } from './feed.ts'
import { createDownloadTask, type DownloadTask } from './lib/download.ts'
import { getStableId } from './lib/stable-id.ts'
import type { AccountAuth, SignInAnswer, SignInStep } from './loader/common.ts'
import { getOriginKey, loaders, tryLoadFeedData } from './loader/index.ts'
import { accountsMessages } from './messages/index.ts'
import { type LoadedAuthor, recalcPostsReading } from './post.ts'
import {
  ACCOUNT_SERVICES,
  type AccountChanges,
  type AccountService,
  type AccountValue,
  type FeedChanges,
  GENERAL_CATEGORY,
  getCrdt,
  getTables,
  type NewAccount
} from './schema.ts'
import { hasCloud } from './settings.ts'

export type { AccountValue, NewAccount }

export function getAccounts(): SqlStore<AccountValue[]> {
  return getTables().accounts.select`ORDER BY "title"`
}

export function getAccount(
  accountId: string
): SqlStore<AccountValue | undefined> {
  return getTables().accounts.row(accountId)
}

export function loadAccount(
  accountId: string
): Promise<AccountValue | undefined> {
  return getTables().accounts.get(accountId)
}

export function isAccountService(name: string): name is AccountService {
  return ACCOUNT_SERVICES.some(service => service === name)
}

export function loadAccounts(
  service?: AccountService
): Promise<AccountValue[]> {
  if (service) {
    return getTables().accounts.load`
      WHERE "service" = ${service} ORDER BY "title"
    `
  } else {
    return getTables().accounts.load`ORDER BY "title"`
  }
}

/**
 * Sign in to the same account again only updates its tokens.
 * The first account of the service is used on subscribing by default.
 */
export async function addAccount(fields: NewAccount): Promise<string> {
  let same = await getTables().accounts.load`
    WHERE "service" = ${fields.service}
  `
  let existing = same.find(i => i.handle === fields.handle)
  if (existing) {
    await getTables().accounts.update(existing.id, {
      avatar: fields.avatar,
      credentials: fields.credentials,
      expired: false,
      server: fields.server,
      title: fields.title
    })
    return existing.id
  }
  return getTables().accounts.create({ follow: same.length === 0, ...fields })
}

export function changeAccount(
  accountId: string,
  changes: AccountChanges
): Promise<void> {
  return getTables().accounts.update(accountId, changes)
}

/**
 * User could change the name or avatar on the service after the sign in.
 */
export async function updateAccountProfile(
  task: DownloadTask,
  account: AccountValue
): Promise<void> {
  let data = await tryLoadFeedData(task, account.service, account.url, {
    account
  })
  if (!data) return
  let changes: AccountChanges = {}
  if ((data.avatar ?? null) !== account.avatar) {
    changes.avatar = data.avatar ?? null
  }
  if (data.handle && data.handle !== account.handle) {
    changes.handle = data.handle
  }
  if (data.title !== account.title) changes.title = data.title
  if (Object.keys(changes).length > 0) {
    await changeAccount(account.id, changes)
  }
}

/**
 * Another account of the service takes the feeds, and the follows sync
 * keeps only feeds of the authors, which other accounts follow.
 */
export async function deleteAccount(accountId: string): Promise<void> {
  let tables = getTables()
  let account = await loadAccount(accountId)
  let feeds = await tables.feeds.load`WHERE "accountId" = ${accountId}`
  let heir =
    account && feeds.length > 0
      ? (await loadAccounts(account.service)).find(i => i.id !== accountId)
      : undefined
  await tables.posts.deleteWhere`"accountId" = ${accountId}`
  if (heir) {
    await tables.feeds.update(
      feeds.map(feed => feed.id),
      { accountId: heir.id }
    )
  } else {
    await tables.posts.deleteWhere`
      "feedId" IN (SELECT "id" FROM "feeds" WHERE "accountId" = ${accountId})
    `
    await tables.feeds.deleteWhere`"accountId" = ${accountId}`
  }
  await tables.accounts.delete(accountId)
  if (heir) {
    // Running sync loaded feeds before they were moved to the heir
    await followsSyncing.get(heir.service)
    await syncFollows(heir.service)
  }
}

/**
 * Tokens for loaders. Bluesky saves them after every refresh.
 */
export function getAccountAuth(account: AccountValue): AccountAuth {
  let auth: AccountAuth = {
    account,
    expire() {
      return changeAccount(account.id, { expired: true })
    },
    async reload() {
      /* node:coverage ignore next 4 */
      if (hasCloud.get()) {
        // Offline client will never be synchronized
        await Promise.race([getClient().waitFor('synchronized'), delay(5000)])
      }
      let synced = await loadAccount(account.id)
      if (
        !synced ||
        synced.credentials.refreshToken ===
          auth.account.credentials.refreshToken
      ) {
        return undefined
      }
      return synced.credentials
    },
    save(credentials) {
      return changeAccount(account.id, { credentials })
    }
  }
  return auth
}

export function isFollowingByAccount(
  task: DownloadTask,
  account: AccountValue,
  url: string
): Promise<boolean> {
  return loaders[account.service].account!.isFollowing(
    task,
    getAccountAuth(account),
    url
  )
}

export function followByAccount(
  task: DownloadTask,
  account: AccountValue,
  url: string
): Promise<void> {
  return loaders[account.service].account!.follow(
    task,
    getAccountAuth(account),
    url
  )
}

export function unfollowByAccount(
  task: DownloadTask,
  account: AccountValue,
  url: string
): Promise<void> {
  return loaders[account.service].account!.unfollow(
    task,
    getAccountAuth(account),
    url
  )
}

/**
 * Offline check of following: refresh puts posts of followed authors
 * without a feed to the account.
 */
export async function hasAccountPostsBy(
  accountId: string,
  url: string
): Promise<boolean> {
  let rows = await getCrdt().select`
    SELECT "id" FROM "posts" WHERE "accountId" = ${accountId}
      AND COALESCE(
        json_extract("repostedBy", '$.url'), json_extract("author", '$.url')
      ) = ${url}
    LIMIT 1
  `
  return rows.length > 0
}

export async function deleteAccountPostsBy(
  accountId: string,
  url: string
): Promise<void> {
  await getTables().posts.deleteWhere`
    "accountId" = ${accountId} AND COALESCE(
      json_extract("repostedBy", '$.url'), json_extract("author", '$.url')
    ) = ${url}
  `
}

/**
 * Feed of the author or hashtag, which account updates by timeline loading,
 * not direct feed request.
 *
 * ID is taken from the URL, so other devices and accounts will create
 * the same feed instead of a duplicate.
 */
export function toVirtualFeed(
  account: AccountValue,
  author: { url: string } & LoadedAuthor
): { id: string } & NewFeed {
  return {
    accountId: account.id,
    avatar: author.avatar,
    id: getStableId(`feed ${author.url}`),
    loader: account.service,
    loaderData: author.loaderData,
    originTitle: author.title,
    title: author.title,
    url: author.url
  }
}

/**
 * User changed the author, which the account follows without a feed.
 * The new feed takes author’s posts from the account.
 */
export async function addVirtualFeed(
  account: AccountValue,
  fields: NewFeed
): Promise<string> {
  let feedId = await addFeed({
    id: getStableId(`feed ${fields.url}`),
    ...fields,
    accountId: account.id
  })
  let posts = getTables().posts
  await posts.updateWhere({ accountId: null, feedId })`
    "accountId" = ${account.id} AND COALESCE(
      json_extract("repostedBy", '$.url'), json_extract("author", '$.url')
    ) = ${fields.url}
  `
  // The feed is the author of own posts
  await posts.updateWhere({ author: null })`
    "feedId" = ${feedId} AND "repostedBy" IS NULL
  `
  await recalcPostsReading(feedId)
  return feedId
}

let followsSyncing = new Map<AccountService, Promise<void>>()

onClient(() => () => {
  followsSyncing.clear()
})

/**
 * Follows are synced once per day on any device.
 */
export function needFollowsSync(account: AccountValue): boolean {
  if (account.expired) return false
  let now = Math.round(Date.now() / 1000)
  return !account.followsSyncedAt || now - account.followsSyncedAt >= 86400
}

/**
 * Feeds of the service’s accounts show the authors, which these accounts
 * follow on the service. Feed of unfollowed author moves to another account,
 * which follows the author, or is deleted with posts.
 *
 * Feeds are deleted only if follows of every account were loaded, since
 * the account with unknown follows could follow the author.
 */
async function loadFollows(
  service: AccountService,
  task: DownloadTask
): Promise<void> {
  let tables = getTables()
  let [accounts, feeds] = await Promise.all([
    loadAccounts(service),
    tables.feeds.load``
  ])
  let owners = new Set(feeds.map(feed => feed.accountId))
  let followers = new Map<string, AccountValue[]>()
  let authors = new Map<string, { url: string } & LoadedAuthor>()
  let synced = new Set<string>()
  let complete = true
  for (let account of accounts) {
    if (account.expired) {
      complete = false
      continue
    }
    let follows: LoadedAuthor[]
    try {
      follows = await loaders[service].account!.getFollows(
        task,
        getAccountAuth(account)
      )
    } catch (e) {
      if (!isRemoteError(e)) throw e
      complete = false
      continue
    }
    // Broken answer must not delete all feeds
    if (follows.length === 0 && owners.has(account.id)) {
      complete = false
      continue
    }
    synced.add(account.id)
    for (let author of follows) {
      if (!author.url) continue
      let key = getOriginKey(service, author.loaderData) ?? author.url
      if (!authors.has(key)) authors.set(key, { ...author, url: author.url })
      followers.set(key, [...(followers.get(key) ?? []), account])
    }
  }

  let byKey = new Map<string, FeedValue>()
  for (let feed of feeds) {
    byKey.set(feed.url, feed)
    let key = getOriginKey(feed.loader, feed.loaderData)
    if (key) byKey.set(key, feed)
  }
  let feedKeys = new Map<string, string>()
  let created: ({ id: string } & NewFeed)[] = []
  for (let [key, author] of authors) {
    let feed = byKey.get(key) ?? byKey.get(author.url)
    if (!feed) {
      created.push(toVirtualFeed(followers.get(key)![0]!, author))
      continue
    }
    feedKeys.set(feed.id, key)
    let changes: FeedChanges = {}
    if (feed.url !== author.url) {
      changes.url = author.url
      changes.originTitle = author.title
      if (feed.title === feed.originTitle) changes.title = author.title
    }
    if (!feed.loaderData && author.loaderData) {
      changes.loaderData = author.loaderData
    }
    if (Object.keys(changes).length > 0) {
      await tables.feeds.update(feed.id, changes)
    }
  }
  await tables.feeds.create(created)
  for (let feed of feeds) {
    if (!feed.accountId || !synced.has(feed.accountId)) continue
    let list = followers.get(feedKeys.get(feed.id) ?? '') ?? []
    if (list.some(account => account.id === feed.accountId)) continue
    if (list[0]) {
      await tables.feeds.update(feed.id, { accountId: list[0].id })
    } else if (complete) {
      await deleteFeed(feed.id)
    }
  }
  await tables.accounts.update([...synced], {
    followsSyncedAt: Math.round(Date.now() / 1000)
  })
}

/**
 * Offline or expired account will be synced again on the next call.
 */
export function syncFollows(
  service: AccountService,
  task = createDownloadTask()
): Promise<void> {
  let running = followsSyncing.get(service)
  if (running) return running
  let sync = loadFollows(service, task)
    .catch((e: unknown) => {
      if (!isRemoteError(e)) getEnvironment().warn(e)
    })
    .finally(() => {
      followsSyncing.delete(service)
    })
  followsSyncing.set(service, sync)
  return sync
}

/**
 * Data between opening service’s page and the return from it.
 */
interface PendingSignIn {
  data: unknown
  service: AccountService
  startedAt: number
  state: string
}

export function startAccountSignIn(
  service: AccountService,
  input: string
): Promise<SignInStep<unknown>> {
  return loaders[service].account!.startSignIn(createDownloadTask(), input)
}

export function continueAccountSignIn(
  service: AccountService,
  data: unknown,
  answer: SignInAnswer
): Promise<SignInStep<unknown>> {
  return loaders[service].account!.continueSignIn(
    createDownloadTask(),
    data,
    answer
  )
}

/**
 * Other errors are our bugs, so the user gets a generic text and we a warning.
 */
export function signInErrorToMessage(error: unknown): string {
  if (error instanceof UserFacingError || NetworkError.is(error)) {
    return errorToMessage(error)
  } else {
    getEnvironment().warn(error)
    return accountsMessages.get().signInFailed
  }
}

/**
 * Open service’s page and return URL fragment, when user will return back.
 * Web leaves the app, so the next Accounts page will call `returnToAccountSignIn()`.
 */
export function openAccountSignInPage(
  service: AccountService,
  step: Extract<SignInStep<unknown>, { type: 'open' }>
): Promise<string | undefined> {
  let env = getEnvironment()
  env.persistentStore['slowreader:accountSignIn'] = JSON.stringify({
    data: step.data,
    service,
    startedAt: Date.now(),
    state: step.state
  } satisfies PendingSignIn)
  return env.openOAuthPage(step.url)
}

/**
 * Secrets of the abandoned sign in should not live on the disk forever.
 * Services’ codes expire in a few minutes anyway.
 */
function takePendingSignIn(): PendingSignIn | undefined {
  let store = getEnvironment().persistentStore
  let json = store['slowreader:accountSignIn']
  delete store['slowreader:accountSignIn']
  if (!json) return undefined
  let pending = JSON.parse(json) as PendingSignIn
  if (Date.now() - pending.startedAt > 10 * 60_000) return undefined
  return pending
}

/**
 * Takes URL fragment of the return from service’s page and continue
 * the sign in. Returns `undefined` if user denied the access.
 */
export async function returnToAccountSignIn(
  callback: string
): Promise<{ service: AccountService; step: SignInStep<unknown> } | undefined> {
  let params = new URLSearchParams(callback)
  let pending = takePendingSignIn()
  if (!pending || params.get('state') !== pending.state) {
    throw new Error('No data of the started sign in')
  }
  let error = params.get('error')
  if (error === 'access_denied') return undefined
  if (error) {
    throw new Error(
      `Sign in error: ${params.get('error_description') ?? error}`
    )
  }
  return {
    service: pending.service,
    step: await continueAccountSignIn(pending.service, pending.data, {
      params,
      type: 'return'
    })
  }
}

export function getUserPostUrl(
  post: { accountId?: null | string; url?: null | string },
  accounts: SqlStoreValue<AccountValue[]>
): string | undefined {
  let url = post.url ?? undefined
  if (!url || accounts.status !== 'ready') return url
  let parsed = URL.parse(url)
  if (!parsed) return url
  let suitable = accounts.value.filter(i =>
    loaders[i.service].isPostUrl?.(parsed)
  )
  let account = suitable.find(i => i.id === post.accountId) ?? suitable[0]
  if (!account) return url
  return (
    loaders[account.service].account?.getUserPostUrl?.(account.server, url) ??
    url
  )
}

export type UserPostUrl = (post: {
  accountId?: null | string
  url?: null | string
}) => string | undefined

/**
 * One store for the whole list, since every post would create own store
 * with parsed accounts.
 */
export function getUserPostUrls(): ReadableAtom<UserPostUrl> {
  return computed(getAccounts(), (accounts): UserPostUrl => {
    return post => getUserPostUrl(post, accounts)
  })
}

let testAccountId = 0

export function testAccount(account: Partial<AccountValue> = {}): AccountValue {
  testAccountId += 1
  return {
    avatar: null,
    categoryId: GENERAL_CATEGORY,
    credentials: {
      accessToken: 'token',
      clientId: 'client',
      clientSecret: null,
      dpopKey: null,
      expiresAt: null,
      refreshToken: null,
      tokenUrl: 'https://mastodon.social/oauth/token'
    },
    expired: false,
    follow: false,
    followsSyncedAt: null,
    handle: `@user${testAccountId}@mastodon.social`,
    id: `account-${testAccountId}`,
    lastOriginId: null,
    lastPublishedAt: null,
    reading: 'fast',
    refreshedAt: null,
    server: 'https://mastodon.social',
    service: 'mastodon',
    title: `User ${testAccountId}`,
    url: `https://mastodon.social/@user${testAccountId}`,
    ...account
  }
}
