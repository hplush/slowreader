import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addAccount,
  addFeed,
  addPost,
  changeAccount,
  deleteAccount,
  deleteAccountPostsBy,
  getAccountAuth,
  hasAccountPostsBy,
  isAccountService,
  loadAccount,
  loadAccounts,
  loadFeeds,
  loadPosts,
  testAccount,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClient, startClient } from './utils.ts'

describe('account', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('loads accounts by service', async () => {
    let mastodon = await addAccount(testAccount({ title: 'B' }))
    let bluesky = await addAccount(
      testAccount({ service: 'bluesky', title: 'A' })
    )
    deepEqual(
      (await loadAccounts()).map(i => i.id),
      [bluesky, mastodon]
    )
    deepEqual(
      (await loadAccounts('mastodon')).map(i => i.id),
      [mastodon]
    )
    equal(isAccountService('bluesky'), true)
    equal(isAccountService('rss'), false)
  })

  test('deletes account with virtual feeds and posts', async () => {
    let accountId = await addAccount(testAccount())
    let virtual = await addFeed(testFeed({ accountId }))
    let normal = await addFeed(testFeed())
    await addPost([
      testPost({ feedId: virtual, originId: 'virtual' }),
      testPost({ feedId: normal, originId: 'normal' }),
      testPost({ accountId, feedId: null, originId: 'account' })
    ])

    await deleteAccount(accountId)
    equal(await loadAccount(accountId), undefined)
    deepEqual(
      (await loadFeeds()).map(i => i.id),
      [normal]
    )
    deepEqual(
      (await loadPosts()).map(i => i.originId),
      ['normal']
    )
  })

  test('finds and deletes account posts by author', async () => {
    let accountId = await addAccount(testAccount())
    let url = 'https://bob.social/@bob'
    await addPost([
      testPost({
        accountId,
        author: { title: 'Bob', url },
        feedId: null,
        originId: 'own'
      }),
      testPost({
        accountId,
        author: { title: 'Dave', url: 'https://dave.social/@dave' },
        feedId: null,
        originId: 'repost',
        repostedBy: { title: 'Bob', url }
      }),
      testPost({
        accountId,
        author: { title: 'Dave', url: 'https://dave.social/@dave' },
        feedId: null,
        originId: 'other'
      })
    ])
    equal(await hasAccountPostsBy(accountId, url), true)
    equal(await hasAccountPostsBy('other', url), false)

    await deleteAccountPostsBy(accountId, url)
    deepEqual(
      (await loadPosts()).map(i => i.originId),
      ['other']
    )
    equal(await hasAccountPostsBy(accountId, url), false)
  })

  test('saves and reloads tokens', async () => {
    let accountId = await addAccount(testAccount())
    let auth = getAccountAuth((await loadAccount(accountId))!)
    let credentials = {
      ...auth.account.credentials,
      accessToken: 'new',
      refreshToken: 'refresh1'
    }
    await auth.save(credentials)
    deepEqual((await loadAccount(accountId))!.credentials, credentials)

    auth.account = { ...auth.account, credentials }
    equal(await auth.reload(), undefined)

    let fromOtherDevice = { ...credentials, refreshToken: 'refresh2' }
    await changeAccount(accountId, { credentials: fromOtherDevice })
    deepEqual(await auth.reload(), fromOtherDevice)

    await deleteAccount(accountId)
    equal(await auth.reload(), undefined)
  })
})
