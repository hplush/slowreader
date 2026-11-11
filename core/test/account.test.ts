import { restoreAll, type Spy, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addAccount,
  addFeed,
  addFilter,
  addPost,
  changeAccount,
  deleteAccount,
  deleteAccountPostsBy,
  getAccountAuth,
  getUserPostUrl,
  getUserPostUrls,
  hasAccountPostsBy,
  HTTPStatusError,
  isAccountService,
  loadAccount,
  loadAccounts,
  type Loader,
  loaders,
  loadFeeds,
  loadFilters,
  loadPosts,
  NetworkError,
  type MovedFeed,
  needFollowsSync,
  type PostAuthor,
  syncFollows,
  testAccount,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClient, expectWarning, startClient, waitFor } from './utils.ts'

describe('account', () => {
  let moves: Record<string, Error | MovedFeed> = {}

  beforeEach(() => {
    startClient()
    moves = {}
    spyOn(loaders.mastodon as Required<Loader>, 'getMovedTo', (task, url) => {
      let moved = moves[url]
      if (moved instanceof Error) return Promise.reject(moved)
      return Promise.resolve(moved)
    })
  })

  afterEach(async () => {
    restoreAll()
    await cleanClient()
  })

  function feedsState(): Promise<[string, null | string][]> {
    return loadFeeds().then(feeds =>
      feeds
        .map((i): [string, null | string] => [i.url, i.accountId])
        .toSorted((a, b) => a[0].localeCompare(b[0]))
    )
  }

  function author(name: string): { title: string; url: string } {
    return { title: name, url: `https://${name}.social/@${name}` }
  }

  function profile(name: string): string {
    return author(name).url
  }

  function spyFollows(
    follows: Record<string, PostAuthor[] | Promise<PostAuthor[]>>
  ): Spy<NonNullable<typeof loaders.mastodon.account>['getFollows']> {
    return spyOn(loaders.mastodon.account!, 'getFollows', (task, auth) => {
      return Promise.resolve(follows[auth.account.id] ?? [])
    })
  }

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

  test('syncs follows of all accounts of the service', async () => {
    let a = await addAccount(testAccount())
    let b = await addAccount(testAccount())
    let c = await addAccount(testAccount({ service: 'bluesky' }))
    let alice = await addFeed(testFeed({ accountId: a, url: profile('alice') }))
    let bob = await addFeed(testFeed({ accountId: a, url: profile('bob') }))
    await addFeed(testFeed({ accountId: a, url: profile('carol') }))
    await addFeed(testFeed({ accountId: b, url: profile('dave') }))
    await addFeed(testFeed({ url: profile('erin') }))
    await addFeed(testFeed({ accountId: c, url: profile('gina') }))
    await addPost([
      testPost({ feedId: alice, originId: 'alice' }),
      testPost({ feedId: bob, originId: 'bob' })
    ])
    let follows = spyFollows({
      [a]: [
        author('alice'),
        author('alice'),
        author('dave'),
        author('erin'),
        { avatar: 'https://frank.social/a.png', ...author('frank') },
        { title: 'No URL' }
      ],
      [b]: [author('carol'), author('dave')]
    })

    let account = (await loadAccount(a))!
    equal(needFollowsSync(account), true)
    let sync = syncFollows('mastodon')
    equal(syncFollows('mastodon'), sync)
    await sync
    equal(follows.callCount, 2)

    deepEqual(await feedsState(), [
      [profile('alice'), a],
      [profile('carol'), b],
      [profile('dave'), b],
      [profile('erin'), null],
      [profile('frank'), a],
      [profile('gina'), c]
    ])
    deepEqual(
      (await loadPosts()).map(i => i.originId),
      ['alice']
    )
    let frank = (await loadFeeds()).find(i => i.url === profile('frank'))!
    deepEqual(
      [
        frank.avatar,
        frank.categoryId,
        frank.loader,
        frank.reading,
        frank.title
      ],
      ['https://frank.social/a.png', null, 'mastodon', null, 'frank']
    )

    let synced = (await loadAccount(a))!
    equal(needFollowsSync(synced), false)
    equal(needFollowsSync((await loadAccount(b))!), false)
    equal(needFollowsSync((await loadAccount(c))!), true)
    equal(
      needFollowsSync({
        ...synced,
        followsSyncedAt: synced.followsSyncedAt! - 86400
      }),
      true
    )
    equal(needFollowsSync({ ...account, expired: true }), false)
  })

  test('keeps Bluesky feed after handle change', async () => {
    let accountId = await addAccount(
      testAccount({ service: 'bluesky', url: 'https://bsky.app/profile/me' })
    )
    let alice = await addFeed(
      testFeed({
        accountId,
        categoryId: 'people',
        loader: 'bluesky',
        loaderData: '{"did":"did:plc:alice"}',
        originTitle: 'Alice',
        reading: 'slow',
        title: 'Alice',
        url: 'https://bsky.app/profile/alice.old'
      })
    )
    let bob = await addFeed(
      testFeed({
        accountId,
        loader: 'bluesky',
        originTitle: 'Bob',
        title: 'My Bob',
        url: 'https://bsky.app/profile/bob'
      })
    )
    await addPost(testPost({ feedId: alice, originId: 'a1' }))
    await addFilter({ action: 'delete', feedId: alice, query: 'spam' })
    spyOn(loaders.bluesky.account!, 'getFollows', () => {
      return Promise.resolve([
        {
          loaderData: '{"did":"did:plc:alice"}',
          title: 'Alice New',
          url: 'https://bsky.app/profile/alice.new'
        },
        {
          loaderData: '{"did":"did:plc:bob"}',
          title: 'Bob',
          url: 'https://bsky.app/profile/bob'
        }
      ])
    })

    await syncFollows('bluesky')
    deepEqual(
      (await loadFeeds())
        .toSorted((a, b) => a.url.localeCompare(b.url))
        .map(i => [
          i.id,
          i.url,
          i.title,
          i.originTitle,
          i.loaderData,
          i.categoryId,
          i.reading
        ]),
      [
        [
          alice,
          'https://bsky.app/profile/alice.new',
          'Alice New',
          'Alice New',
          '{"did":"did:plc:alice"}',
          'people',
          'slow'
        ],
        [
          bob,
          'https://bsky.app/profile/bob',
          'My Bob',
          'Bob',
          '{"did":"did:plc:bob"}',
          '__general',
          'fast'
        ]
      ]
    )
    deepEqual(
      (await loadPosts()).map(i => [i.originId, i.feedId]),
      [['a1', alice]]
    )
    deepEqual(
      (await loadFilters()).map(i => i.feedId),
      [alice]
    )
  })

  test('keeps feed of moved author', async () => {
    let accountId = await addAccount(testAccount())
    let ann = await addFeed(
      testFeed({
        accountId,
        categoryId: 'people',
        loader: 'mastodon',
        originTitle: 'ann',
        reading: 'slow',
        title: 'ann',
        url: profile('ann')
      })
    )
    await addPost(testPost({ feedId: ann, originId: 'a1' }))
    spyFollows({ [accountId]: [author('ann2'), author('bob')] })
    moves = {
      [profile('ann')]: {
        avatar: 'https://ann2.social/a.png',
        loaderData: '{"id":"2"}',
        title: 'Ann',
        url: profile('ann2')
      }
    }

    await syncFollows('mastodon')
    deepEqual(await feedsState(), [
      [profile('ann2'), accountId],
      [profile('bob'), accountId]
    ])
    let feed = (await loadFeeds()).find(i => i.id === ann)!
    deepEqual(
      [
        feed.avatar,
        feed.categoryId,
        feed.loaderData,
        feed.originTitle,
        feed.reading,
        feed.title
      ],
      [
        'https://ann2.social/a.png',
        'people',
        '{"id":"2"}',
        'Ann',
        'slow',
        'Ann'
      ]
    )
    deepEqual(
      (await loadPosts()).map(i => [i.originId, i.feedId]),
      [['a1', ann]]
    )
  })

  test('merges feed of moved author with feed from timeline', async () => {
    let accountId = await addAccount(testAccount())
    let old = await addFeed(
      testFeed({
        accountId,
        categoryId: 'people',
        loader: 'mastodon',
        originTitle: 'ann',
        reading: 'slow',
        title: 'Ann',
        url: profile('ann')
      })
    )
    let timeline = await addFeed(
      testFeed({
        accountId,
        loader: 'mastodon',
        reading: null,
        url: profile('ann2')
      })
    )
    await addPost([
      testPost({ feedId: old, originId: 'old' }),
      testPost({ feedId: timeline, originId: 'new' })
    ])
    await addFilter({ action: 'delete', feedId: old, query: 'spam' })
    spyFollows({ [accountId]: [author('ann2')] })
    moves = { [profile('ann')]: author('ann2') }

    await syncFollows('mastodon')
    let feeds = await loadFeeds()
    deepEqual(
      feeds.map(i => [i.id, i.url, i.categoryId, i.reading, i.title]),
      [[timeline, profile('ann2'), 'people', 'slow', 'Ann']]
    )
    deepEqual(
      (await loadPosts())
        .toSorted((a, b) => a.originId.localeCompare(b.originId))
        .map(i => [i.originId, i.feedId]),
      [
        ['new', timeline],
        ['old', timeline]
      ]
    )
    deepEqual(
      (await loadFilters()).map(i => i.feedId),
      [timeline]
    )
  })

  test('keeps feed if move check failed', async () => {
    let accountId = await addAccount(testAccount())
    await addFeed(
      testFeed({ accountId, loader: 'mastodon', url: profile('ann') })
    )
    await addFeed(
      testFeed({ accountId, loader: 'mastodon', url: profile('dan') })
    )
    await addFeed(
      testFeed({ accountId, loader: 'mastodon', url: profile('eve') })
    )
    spyFollows({ [accountId]: [author('bob')] })
    moves = {
      [profile('ann')]: new HTTPStatusError(
        500,
        profile('ann'),
        '',
        new Headers()
      ),
      [profile('dan')]: new HTTPStatusError(
        404,
        profile('dan'),
        '',
        new Headers()
      ),
      [profile('eve')]: author('moved-unfollowed')
    }

    await syncFollows('mastodon')
    deepEqual(await feedsState(), [
      [profile('ann'), accountId],
      [profile('bob'), accountId]
    ])
  })

  test('keeps feeds if follows of some account are unknown', async () => {
    let a = await addAccount(testAccount())
    let b = await addAccount(testAccount())
    let expired = await addAccount(testAccount({ expired: true }))
    await addFeed(testFeed({ accountId: a, url: profile('alice') }))
    await addFeed(testFeed({ accountId: b, url: profile('bob') }))
    let state = await feedsState()

    spyFollows({ [a]: [author('carol')], [b]: [] })
    await syncFollows('mastodon')
    deepEqual(await feedsState(), [...state, [profile('carol'), a]])
    equal((await loadAccount(a))!.followsSyncedAt === null, false)
    equal((await loadAccount(b))!.followsSyncedAt, null)
    equal((await loadAccount(expired))!.followsSyncedAt, null)

    restoreAll()
    await changeAccount(expired, { expired: false })
    let follows = spyFollows({ [a]: [author('carol')] })
    follows.nextResult(
      Promise.reject(new NetworkError(new TypeError('offline')))
    )
    await syncFollows('mastodon')
    equal((await loadFeeds()).length, 3)

    let bug = new Error('bug')
    follows.nextResult(Promise.reject(bug))
    await expectWarning(() => syncFollows('mastodon'), [bug])
  })

  test('gives feeds of deleted account to another account', async () => {
    let a = await addAccount(testAccount())
    let b = await addAccount(testAccount())
    await addAccount(testAccount({ service: 'bluesky' }))
    let alice = await addFeed(testFeed({ accountId: a, url: profile('alice') }))
    let bob = await addFeed(testFeed({ accountId: a, url: profile('bob') }))
    await addPost([
      testPost({ feedId: alice, originId: 'alice' }),
      testPost({ feedId: bob, originId: 'bob' }),
      testPost({ accountId: a, feedId: null, originId: 'own' })
    ])
    spyFollows({
      [a]: [author('alice'), author('bob')],
      [b]: [author('alice')]
    })

    await deleteAccount(a)
    equal(await loadAccount(a), undefined)
    deepEqual(await feedsState(), [[profile('alice'), b]])
    deepEqual(
      (await loadPosts()).map(i => i.originId),
      ['alice']
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
      ...auth.account.credentials!,
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
