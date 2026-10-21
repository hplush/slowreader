import { withMeta, type WithoutMeta } from '@logux/client/db'
import type { SqlStore } from '@nanostores/sql'
import { delay } from 'nanodelay'

import { getClient } from './client.ts'
import { getEnvironment } from './environment.ts'
import { addFeed, type NewFeed } from './feed.ts'
import { createDownloadTask, type DownloadTask } from './lib/download.ts'
import type { AccountAuth, SignInAnswer, SignInStep } from './loader/common.ts'
import { loaders, tryLoadFeedData } from './loader/index.ts'
import { recalcPostsReading } from './post.ts'
import {
  ACCOUNT_SERVICES,
  type AccountChanges,
  type AccountService,
  type AccountValue,
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

export async function deleteAccount(accountId: string): Promise<void> {
  let tables = getTables()
  await tables.posts.deleteWhere`
    "accountId" = ${accountId} OR "feedId" IN (
      SELECT "id" FROM "feeds" WHERE "accountId" = ${accountId}
    )
  `
  await tables.feeds.deleteWhere`"accountId" = ${accountId}`
  return tables.accounts.delete(accountId)
}

/**
 * Tokens for loaders. Bluesky saves them after every refresh.
 */
export function getAccountAuth(account: AccountValue): AccountAuth {
  let auth: AccountAuth = {
    account,
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
 * User changed the author, which the account follows without a feed.
 * The new feed takes author’s posts from the account.
 */
export async function addVirtualFeed(
  account: AccountValue,
  fields: NewFeed
): Promise<string> {
  let feedId = await addFeed({ ...fields, accountId: account.id })
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

let testAccountId = 0

export function testAccount(
  account: Partial<WithoutMeta<AccountValue>> = {}
): AccountValue {
  testAccountId += 1
  return withMeta<AccountValue>({
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
    follow: false,
    handle: `@user${testAccountId}@mastodon.social`,
    id: `account-${testAccountId}`,
    lastOriginId: null,
    lastPublishedAt: null,
    refreshedAt: null,
    server: 'https://mastodon.social',
    service: 'mastodon',
    title: `User ${testAccountId}`,
    url: `https://mastodon.social/@user${testAccountId}`,
    ...account
  })
}
