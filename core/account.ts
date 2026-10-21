import { withMeta, type WithoutMeta } from '@logux/client/db'
import type { SqlStore } from '@nanostores/sql'

import { getEnvironment } from './environment.ts'
import { createDownloadTask, type DownloadTask } from './lib/download.ts'
import type { SignInAnswer, SignInStep } from './loader/common.ts'
import { loaders, tryLoadFeedData } from './loader/index.ts'
import {
  type AccountChanges,
  type AccountService,
  type AccountValue,
  GENERAL_CATEGORY,
  getTables,
  type NewAccount
} from './schema.ts'

export type { AccountValue, NewAccount }

export function getAccounts(): SqlStore<AccountValue[]> {
  return getTables().accounts.select`ORDER BY "title"`
}

export function getAccount(
  accountId: string
): SqlStore<AccountValue | undefined> {
  return getTables().accounts.row(accountId)
}

export function loadAccounts(): Promise<AccountValue[]> {
  return getTables().accounts.load`ORDER BY "title"`
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

export function deleteAccount(accountId: string): Promise<void> {
  return getTables().accounts.delete(accountId)
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
    server: 'https://mastodon.social',
    service: 'mastodon',
    title: `User ${testAccountId}`,
    url: `https://mastodon.social/@user${testAccountId}`,
    ...account
  })
}
