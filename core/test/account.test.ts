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
  getUserPostUrl,
  getUserPostUrls,
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
import { cleanClient, startClient, waitFor } from './utils.ts'

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

    await auth.expire()
    equal((await loadAccount(accountId))!.expired, true)
    await addAccount({ ...auth.account, expired: true })
    equal((await loadAccount(accountId))!.expired, false)

    await deleteAccount(accountId)
    equal(await auth.reload(), undefined)
  })

  test('opens post on user server', () => {
    let url = 'https://other.social/@jane/1'
    let redirect =
      '/authorize_interaction?uri=https%3A%2F%2Fother.social%2F%40jane%2F1'
    let bluesky = testAccount({
      server: 'https://bsky.social',
      service: 'bluesky'
    })
    let first = testAccount({ server: 'https://first.social' })
    let second = testAccount({ server: 'https://second.social' })
    let all = { status: 'ready' as const, value: [bluesky, first, second] }
    equal(getUserPostUrl({ url }, { status: 'loading' }), url)
    equal(getUserPostUrl({ url: null }, all), undefined)
    equal(getUserPostUrl({ url }, { status: 'ready', value: [bluesky] }), url)
    equal(getUserPostUrl({ url }, all), `https://first.social${redirect}`)
    equal(
      getUserPostUrl({ accountId: second.id, url }, all),
      `https://second.social${redirect}`
    )
    equal(
      getUserPostUrl(
        { url },
        {
          status: 'ready',
          value: [testAccount({ server: 'https://other.social' })]
        }
      ),
      url
    )
    equal(
      getUserPostUrl({ url: 'https://blog.example.com/post' }, all),
      'https://blog.example.com/post'
    )
    let skeet = 'https://bsky.app/profile/jane.bsky.social/post/3abc'
    equal(getUserPostUrl({ url: skeet }, all), skeet)
    equal(getUserPostUrl({ url: 'not a URL' }, all), 'not a URL')
  })

  test('has user post URLs store', async () => {
    await addAccount(testAccount({ server: 'https://first.social' }))
    let $userPostUrl = getUserPostUrls()
    let url = 'https://other.social/@jane/1'
    equal($userPostUrl.get()({ url }), url)
    await waitFor($userPostUrl, get => get({ url }) !== url)
    equal(
      $userPostUrl.get()({ url }),
      'https://first.social/authorize_interaction' +
        '?uri=https%3A%2F%2Fother.social%2F%40jane%2F1'
    )
  })
})
