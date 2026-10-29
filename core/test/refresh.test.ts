import type { CrossTabClient } from '@logux/client'
import { restoreAll, type Spy, spyOn } from 'nanospy'
import { deepEqual, equal, fail, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addFeed,
  addFilter,
  addPost,
  createPostsList,
  DEFAULT_REFRESH_STATISTICS,
  deleteAccount,
  deleteFeed,
  fastPostsMaxAge,
  syncedSettingsLoading,
  getClient,
  loadAccount,
  loadFeed,
  loadPosts,
  loadRecentPosts,
  type OriginPost,
  ParseError,
  HTTPStatusError,
  isRefreshing,
  loaders,
  NetworkError,
  type PostsListResult,
  type PostValue,
  refreshErrors,
  refreshPosts,
  refreshProgress,
  refreshStatistics,
  refreshStatus,
  setRequestMethod,
  stopRefreshing,
  testAccount,
  testFeed,
  testPost,
  waitLoading
} from '../index.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  createPromise,
  startClient,
  expectRequest,
  expectWarning,
  mockRequest,
  setupNodeDom,
  throws
} from './utils.ts'

setupNodeDom()

describe('refresh', () => {
  beforeEach(async () => {
    mockRequest()
    startClient()
    await waitLoading(syncedSettingsLoading)
    fastPostsMaxAge.set(0)
  })

  afterEach(async () => {
    fastPostsMaxAge.set(604800)
    refreshStatistics.set({ ...DEFAULT_REFRESH_STATISTICS })
    await cleanClient()
    restoreAll()
    checkAndRemoveRequestMock()
  })

  async function getPostKeys<Key extends keyof PostValue>(
    key: Key
  ): Promise<PostValue[Key][]> {
    let posts = await loadPosts()
    return posts
      .toSorted((a, b) => a.originId.localeCompare(b.originId))
      .map(post => post[key])
  }

  test('is ready to be stopped from the start', () => {
    stopRefreshing()
  })

  function fakeSyncState(state: CrossTabClient['state']): typeof fakeState {
    let logux = getClient()
    let on = logux.on.bind(logux)
    let listener: () => void = () => {}
    spyOn(logux, 'on', ((event: 'state', callback: () => void) => {
      if (event === 'state') listener = callback
      return on(event, callback)
    }) as typeof logux.on)
    function fakeState(next: CrossTabClient['state']): void {
      logux.state = next
      listener()
    }
    logux.state = state
    return fakeState
  }

  test('waits for the sync before refresh', async () => {
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let load = spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => Promise.resolve([[], undefined]))
    })
    let changeState = fakeSyncState('sending')

    let finished = refreshPosts()
    await setTimeout(10)
    equal(refreshStatus.get(), 'refreshing')
    equal(load.callCount, 0)

    changeState('synchronized')
    await finished
    equal(load.callCount, 1)
    equal(refreshStatus.get(), 'done')
  })

  test('stops refresh while waiting for the sync', async () => {
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let load = spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => Promise.resolve([[], undefined]))
    })
    let changeState = fakeSyncState('connecting')

    let finished = refreshPosts()
    stopRefreshing()
    changeState('disconnected')
    await finished
    equal(load.callCount, 0)
    equal(refreshStatus.get(), 'start')
  })

  test('updates posts', async () => {
    let feedId1 = await addFeed(
      testFeed({
        lastOriginId: 'post1',
        loader: 'rss',
        reading: 'slow',
        url: 'https://one.com/'
      })
    )
    let feedId2 = await addFeed(
      testFeed({
        lastOriginId: 'post2',
        lastPublishedAt: 5000,
        loader: 'atom',
        reading: 'fast',
        url: 'https://two.com/'
      })
    )
    await addFilter({
      action: 'slow',
      feedId: feedId2,
      query: 'include(slow)'
    })
    await addFilter({
      action: 'delete',
      feedId: feedId2,
      query: 'include(delete)'
    })

    deepEqual(refreshErrors.get(), [])
    equal(refreshStatus.get(), 'start')
    equal(isRefreshing.get(), false)
    equal(refreshProgress.get(), 0)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 0,
      foundSlow: 0,
      initializing: false,
      processedFeeds: 0,
      totalFeeds: 0
    })

    let rss1 = createPromise<PostsListResult>()
    let rssLoad = spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => rss1.promise())
    })
    let atom1 = createPromise<PostsListResult>()
    let atomLoad = spyOn(loaders.atom, 'getPosts', () => {
      return createPostsList(() => atom1.promise())
    })

    let finished = false
    refreshPosts().then(() => {
      finished = true
    })
    equal(refreshStatus.get(), 'refreshing')
    equal(isRefreshing.get(), true)
    equal(refreshProgress.get(), 0)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 0,
      foundSlow: 0,
      initializing: true,
      processedFeeds: 0,
      totalFeeds: 0
    })

    await setTimeout(10)
    equal(refreshProgress.get(), 0)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 0,
      foundSlow: 0,
      initializing: false,
      processedFeeds: 0,
      totalFeeds: 2
    })
    equal(finished, false)
    equal(rssLoad.calls.length, 1)
    equal(rssLoad.calls[0]![1], 'https://one.com/')
    equal(atomLoad.calls.length, 1)
    equal(atomLoad.calls[0]![1], 'https://two.com/')

    rss1.resolve([
      [
        { originId: 'post3', title: '3' },
        { originId: 'post2', title: '2' },
        { originId: 'post1', title: '1' },
        { originId: 'post0', title: '0' }
      ],
      undefined
    ])
    await setTimeout(10)
    equal(refreshProgress.get(), 0.5)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 0,
      foundSlow: 2,
      initializing: false,
      processedFeeds: 1,
      totalFeeds: 2
    })
    deepEqual(await getPostKeys('title'), ['2', '3'])
    deepEqual(await getPostKeys('reading'), ['slow', 'slow'])
    deepEqual(await getPostKeys('feedId'), [feedId1, feedId1])
    let publishedAt = (await getPostKeys('publishedAt'))[0]!
    ok(Math.abs(publishedAt - Date.now() / 1000) < 2)
    deepEqual((await loadFeed(feedId1))!.lastOriginId, 'post3')
    deepEqual((await loadFeed(feedId1))!.lastPublishedAt, null)

    let atom2 = atom1.next()
    atom1.resolve([
      [
        { originId: 'post9', publishedAt: 9000, title: '9 delete' },
        { originId: 'post8', publishedAt: 8000, title: '8 slow' },
        { originId: 'post7', publishedAt: 7000, title: '7' }
      ],
      () => atom2.promise()
    ])
    await setTimeout(10)
    equal(finished, false)
    equal(refreshProgress.get(), 0.5)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 1,
      foundSlow: 3,
      initializing: false,
      processedFeeds: 1,
      totalFeeds: 2
    })
    deepEqual(await getPostKeys('title'), ['2', '3', '7', '8 slow'])
    deepEqual(await getPostKeys('reading'), ['slow', 'slow', 'fast', 'slow'])
    deepEqual((await loadFeed(feedId2))!.lastOriginId, 'post2')
    deepEqual((await loadFeed(feedId2))!.lastPublishedAt, 5000)

    atom2.resolve([
      [
        { originId: 'post6', publishedAt: 6000, title: '6' },
        { originId: 'post5', publishedAt: 5000, title: '5' },
        { originId: 'post4', publishedAt: 4000, title: '4' }
      ],
      () => {
        fail()
      }
    ])
    await setTimeout(10)
    deepEqual(await getPostKeys('title'), ['2', '3', '6', '7', '8 slow'])
    deepEqual((await loadFeed(feedId2))!.lastOriginId, 'post9')
    deepEqual((await loadFeed(feedId2))!.lastPublishedAt, 9000)
    equal(finished, true)
    deepEqual(refreshErrors.get(), [])
    equal(refreshStatus.get(), 'done')
    equal(isRefreshing.get(), false)
    equal(refreshProgress.get(), 1)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 2,
      foundSlow: 3,
      initializing: false,
      processedFeeds: 2,
      totalFeeds: 2
    })

    restoreAll()
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => {
        return Promise.resolve([[{ originId: 'post3', title: '3' }], undefined])
      })
    })
    spyOn(loaders.atom, 'getPosts', () => {
      return createPostsList(() => {
        return Promise.resolve([
          [{ originId: 'post9', publishedAt: 9000, title: '9 delete' }],
          undefined
        ])
      })
    })

    await setTimeout(1500)
    equal(refreshStatus.get(), 'start')

    refreshPosts()
    equal(refreshStatus.get(), 'refreshing')
    equal(refreshProgress.get(), 0)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 0,
      foundSlow: 0,
      initializing: true,
      processedFeeds: 0,
      totalFeeds: 0
    })
    await setTimeout(10)
    equal(refreshStatus.get(), 'done')
    equal(refreshProgress.get(), 1)
    deepEqual(await getPostKeys('title'), ['2', '3', '6', '7', '8 slow'])
  })

  test('is ready to feed deletion during refreshing', async () => {
    let feedId = await addFeed(
      testFeed({
        lastOriginId: 'post1',
        loader: 'rss',
        reading: 'slow'
      })
    )
    let rss1 = createPromise<PostsListResult>()
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => rss1.promise())
    })

    refreshPosts()
    await setTimeout(10)

    let rss2 = rss1.next()
    rss1.resolve([
      [
        { originId: 'post6', title: '6' },
        { originId: 'post5', title: '5' },
        { originId: 'post4', title: '4' }
      ],
      () => rss2.promise()
    ])
    await setTimeout(10)
    deepEqual(await getPostKeys('title'), ['4', '5', '6'])

    await deleteFeed(feedId)
    rss2.resolve([[{ originId: 'post3', title: '3' }], undefined])
    await setTimeout(10)
    equal(refreshStatus.get(), 'done')
    equal(await loadFeed(feedId), undefined)
    deepEqual(await getPostKeys('title'), [])
  })

  test('writes every page and changes feed by one action', async () => {
    let feedId = await addFeed(
      testFeed({
        lastOriginId: 'post1',
        loader: 'rss',
        reading: 'slow'
      })
    )
    let actions: string[] = []
    let unbind = getClient().on('add', action => {
      actions.push(action.type)
    })

    let rss1 = createPromise<PostsListResult>()
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => rss1.promise())
    })

    refreshPosts()
    await setTimeout(10)

    let rss2 = rss1.next()
    rss1.resolve([[{ originId: 'post4', title: '4' }], () => rss2.promise()])
    await setTimeout(10)
    deepEqual(await getPostKeys('title'), ['4'])

    rss2.resolve([
      [
        { originId: 'post3', title: '3' },
        { originId: 'post1', title: '1' }
      ],
      undefined
    ])
    await setTimeout(10)

    deepEqual(await getPostKeys('title'), ['3', '4'])
    deepEqual(actions, ['posts/created', 'posts/created', 'feeds/changed'])
    equal((await loadFeed(feedId))!.lastOriginId, 'post4')
    unbind()
  })

  test('does not add posts twice after a stopped refresh', async () => {
    await addFeed(
      testFeed({
        lastOriginId: 'post1',
        loader: 'rss',
        reading: 'slow'
      })
    )
    let rss2 = createPromise<PostsListResult>()
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() =>
        Promise.resolve([
          [
            { originId: 'post4', title: '4' },
            { originId: 'post3', title: '3' }
          ],
          () => rss2.promise()
        ])
      )
    })

    refreshPosts()
    await setTimeout(10)
    deepEqual(await getPostKeys('title'), ['3', '4'])
    stopRefreshing()

    refreshPosts()
    await setTimeout(10)
    rss2.resolve([[{ originId: 'post2', title: '2' }], undefined])
    await setTimeout(10)

    deepEqual(await getPostKeys('title'), ['2', '3', '4'])
    equal(refreshStatus.get(), 'done')
  })

  test('cancels refreshing', async () => {
    await addFeed(
      testFeed({
        lastOriginId: 'post1',
        url: 'https://one.com/'
      })
    )

    let rss = expectRequest('https://one.com/').andWait()
    refreshPosts()
    refreshPosts()
    refreshPosts()
    await setTimeout(10)

    stopRefreshing()
    equal(refreshStatus.get(), 'start')
    equal(rss.aborted, true)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 0,
      foundSlow: 0,
      initializing: false,
      processedFeeds: 0,
      totalFeeds: 1
    })
    stopRefreshing()
    equal(refreshStatus.get(), 'start')
  })

  test('is ready for network errors', async () => {
    await addFeed(
      testFeed({
        lastOriginId: 'post1',
        url: 'https://one.com/'
      })
    )
    let feed2 = await addFeed(
      testFeed({
        lastOriginId: 'post2',
        lastPublishedAt: 5000,
        loader: 'atom'
      })
    )

    let rssHadError = false
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(async () => {
        if (rssHadError) {
          return Promise.resolve([
            [{ originId: 'post1', title: '1' }],
            undefined
          ])
        } else {
          rssHadError = true
          throw new NetworkError(new TypeError('network error'))
        }
      })
    })
    let atomError = new HTTPStatusError(
      500,
      'server is down',
      '',
      new Headers()
    )
    spyOn(loaders.atom, 'getPosts', () => {
      return createPostsList(async () => {
        await setTimeout(1)
        throw atomError
      })
    })

    let icons: string[] = []
    refreshStatus.subscribe(icon => {
      icons.push(icon)
    })
    await expectWarning(async () => {
      refreshPosts()
      await setTimeout(50)
    }, [atomError])

    deepEqual(refreshStatistics.get(), {
      errorFeeds: 1,
      errorRequests: 4,
      foundFast: 0,
      foundSlow: 0,
      initializing: false,
      processedFeeds: 2,
      totalFeeds: 2
    })
    deepEqual(icons, ['done', 'refreshing', 'refreshingError', 'error'])
    deepEqual(
      refreshErrors.get().map(i => ['feed' in i && i.feed.id, i.error.name]),
      [[feed2, 'HTTPStatusError']]
    )

    await setTimeout(1500)
    equal(refreshStatus.get(), 'error')
  })

  test('is ready to not found previous ID and time', async () => {
    let feedId = await addFeed(
      testFeed({
        lastOriginId: 'post1',
        lastPublishedAt: 1000,
        url: 'https://one.com/'
      })
    )
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => {
        return Promise.resolve([
          [
            { originId: 'post6', publishedAt: 6000, title: '6' },
            { originId: 'post5', publishedAt: 5000, title: '5' },
            { originId: 'post4', publishedAt: 4000, title: '4' }
          ],
          undefined
        ])
      })
    })

    refreshPosts()
    await setTimeout(50)
    equal(refreshStatus.get(), 'done')
    deepEqual(await getPostKeys('title'), ['4', '5', '6'])

    let feed = await loadFeed(feedId)
    deepEqual(feed!.lastOriginId, 'post6')
    deepEqual(feed!.lastPublishedAt, 6000)
  })

  test('sorts posts', async () => {
    let feedId = await addFeed(
      testFeed({
        lastOriginId: 'post1',
        lastPublishedAt: 1000,
        url: 'https://one.com/'
      })
    )
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => {
        return Promise.resolve([
          [
            { originId: 'post1', publishedAt: 1000, title: '1' },
            { originId: 'postY', title: 'Y' },
            { originId: 'post2', publishedAt: 2000, title: '2' },
            { originId: 'post4', publishedAt: 4000, title: '4' },
            { originId: 'post3', publishedAt: 3000, title: '3' },
            { originId: 'postX', title: 'X' }
          ],
          undefined
        ])
      })
    })

    refreshPosts()
    await setTimeout(10)
    equal(refreshStatus.get(), 'done')
    deepEqual(await getPostKeys('title'), ['2', '3', '4'])

    let feed = await loadFeed(feedId)
    deepEqual(feed!.lastOriginId, 'post4')
    deepEqual(feed!.lastPublishedAt, 4000)
  })

  test('adds parts of reposted thread', async () => {
    let bluesky = loaders.bluesky as Required<typeof loaders.bluesky>
    let feedId = await addFeed(
      testFeed({
        lastOriginId: 'post1',
        lastPublishedAt: 1000,
        loader: 'bluesky',
        url: 'https://bsky.app/profile/jane'
      })
    )
    let jane = { title: 'Jane' }
    spyOn(bluesky, 'getPosts', () => {
      return createPostsList(() => {
        return Promise.resolve([
          [
            {
              hasReplies: true,
              originId: 'start',
              publishedAt: 400,
              repostedBy: jane,
              sortedAt: 3000,
              title: 'start'
            },
            {
              originId: 'part2',
              publishedAt: 600,
              repostedBy: jane,
              repostedPart: true,
              sortedAt: 2500,
              title: 'part2'
            },
            {
              originId: 'single',
              publishedAt: 200,
              repostedBy: jane,
              sortedAt: 2000
            },
            { originId: 'post1', publishedAt: 1000, title: '1' }
          ],
          undefined
        ])
      })
    })
    let descendants = spyOn(bluesky, 'getThreadDescendants', () =>
      Promise.resolve([
        {
          hasReplies: true,
          originId: 'part1',
          publishedAt: 500,
          selfReplyTo: 'original',
          title: 'part1'
        },
        {
          originId: 'part2',
          publishedAt: 600,
          selfReplyTo: 'part1',
          title: 'part2'
        }
      ])
    )

    refreshPosts()
    await setTimeout(10)
    equal(refreshStatus.get(), 'done')
    deepEqual(
      descendants.calls.map(call => call[2]),
      ['start']
    )
    deepEqual(await getPostKeys('originId'), [
      'part1',
      'part2',
      'single',
      'start'
    ])
    deepEqual(await getPostKeys('threadId'), ['start', 'start', null, 'start'])
    deepEqual(await getPostKeys('merged'), [true, false, false, false])
    deepEqual(await getPostKeys('sortedAt'), [500, 2500, 2000, 3000])
    deepEqual(await getPostKeys('publishedAt'), [500, 600, 200, 400])
    deepEqual((await loadFeed(feedId))!.lastPublishedAt, 3000)
  })

  test('retries with some delay', async () => {
    await addFeed(testFeed({ url: 'https://a.com/' }))
    await addFeed(testFeed({ url: 'https://b.com/' }))
    await addFeed(testFeed({ url: 'https://c.com/' }))

    let aAttempts: number[] = []
    let bAttempts: number[] = []
    let cAttempts: number[] = []

    spyOn(loaders.rss, 'getPosts', (_, url) => {
      return createPostsList(() => {
        if (url === 'https://a.com/') {
          aAttempts.push(Date.now())
          if (aAttempts.length === 1) {
            let headers = new Headers()
            headers.set('Retry-After', '1')
            throw new HTTPStatusError(429, url, 'Rate limited', headers)
          } else {
            return [[{ originId: 'post1', title: '1' }], undefined]
          }
        } else if (url === 'https://b.com/') {
          bAttempts.push(Date.now())
          if (bAttempts.length === 1) {
            let futureTime = new Date(Date.now() + 2000).toUTCString()
            let headers = new Headers()
            headers.set('RateLimit-Reset', futureTime)
            throw new HTTPStatusError(429, url, 'Rate limited', headers)
          } else {
            return [[{ originId: 'post2', title: '2' }], undefined]
          }
        } else if (url === 'https://c.com/') {
          cAttempts.push(Date.now())
          if (cAttempts.length === 1) {
            let headers = new Headers()
            throw new HTTPStatusError(503, url, 'Service unavailable', headers)
          } else {
            return [[{ originId: 'post3', title: '3' }], undefined]
          }
        }
        return [[], undefined]
      })
    })

    refreshPosts()

    await setTimeout(10)
    equal(refreshStatistics.get().initializing, false)
    equal(aAttempts.length, 1)
    equal(bAttempts.length, 1)
    equal(cAttempts.length, 1)

    await waitLoading(isRefreshing)

    equal(aAttempts.length, 2)
    let aDiff = aAttempts[1]! - aAttempts[0]!
    ok(aDiff >= 900, `${aDiff}ms should be >= 900ms`)
    // We are testing ≥900ms because milliseconds are truncated to seconds

    equal(bAttempts.length, 2)
    let bDiff = bAttempts[1]! - bAttempts[0]!
    ok(bDiff >= 900, `${bDiff}ms should be >= 900ms`)

    equal(cAttempts.length, 2)
    let cDiff = cAttempts[1]! - cAttempts[0]!
    ok(cDiff >= 900, `${cDiff}ms should be >= 900ms`)

    equal(refreshStatus.get(), 'done')
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 3,
      foundFast: 3,
      foundSlow: 0,
      initializing: false,
      processedFeeds: 3,
      totalFeeds: 3
    })
  })

  test('sends If-Modified-Since', async () => {
    await addFeed(testFeed())

    let requestCount = 0
    let capturedHeaders: Record<string, string>[] = []

    setRequestMethod((url, opts) => {
      capturedHeaders.push((opts?.headers ?? {}) as Record<string, string>)
      requestCount += 1
      if (requestCount === 1) {
        return Promise.resolve(
          new Response(
            `<?xml version="1.0"?>
            <rss><channel>
              <title>Feed</title>
            </channel></rss>`,
            {
              headers: {
                'Content-Type': 'application/rss+xml',
                'Last-Modified': 'Thu, 01 Jan 2026 00:00:00 GMT'
              },
              status: 200
            }
          )
        )
      } else {
        return Promise.resolve(new Response(null, { status: 304 }))
      }
    })

    await refreshPosts()
    equal(requestCount, 1)
    equal(capturedHeaders[0]!['If-Modified-Since'], undefined)
    equal(refreshStatistics.get().errorRequests, 0)

    await refreshPosts()
    equal(requestCount, 2)
    equal(typeof capturedHeaders[1]!['If-Modified-Since'], 'string')
    equal(refreshStatistics.get().errorRequests, 0)
  })

  test('deletes old fast posts before refresh', async () => {
    let now = Math.round(Date.now() / 1000)
    let day = 24 * 60 * 60
    await addPost([
      testPost({ originId: 'fast1', publishedAt: now - day }),
      testPost({ originId: 'fast3', publishedAt: now - 3 * day }),
      testPost({ originId: 'fast10', publishedAt: now - 10 * day }),
      testPost({
        originId: 'slow10',
        publishedAt: now - 10 * day,
        reading: 'slow'
      })
    ])

    await refreshPosts()
    deepEqual(await getPostKeys('originId'), [
      'fast1',
      'fast10',
      'fast3',
      'slow10'
    ])

    fastPostsMaxAge.set(7 * day)
    await refreshPosts()
    deepEqual(await getPostKeys('originId'), ['fast1', 'fast3', 'slow10'])

    fastPostsMaxAge.set(2 * day)
    await refreshPosts()
    deepEqual(await getPostKeys('originId'), ['fast1', 'slow10'])
  })
})

const BOB = 'https://bob.social/@bob'

describe('refresh of accounts', () => {
  beforeEach(async () => {
    mockRequest()
    startClient()
    await waitLoading(syncedSettingsLoading)
    fastPostsMaxAge.set(0)
  })

  afterEach(async () => {
    fastPostsMaxAge.set(604800)
    await cleanClient()
    restoreAll()
    checkAndRemoveRequestMock()
  })

  let signedIn = loaders.mastodon.account!

  function by(
    name: string,
    originId: string,
    fields: Partial<OriginPost> = {}
  ): OriginPost {
    return {
      author: { title: name, url: `https://${name}.social/@${name}` },
      id: originId,
      originId,
      ...fields
    }
  }

  function spyTimeline(
    ...pages: OriginPost[][]
  ): Spy<typeof signedIn.getTimeline> {
    return spyOn(signedIn, 'getTimeline', () => {
      function load(index: number): Promise<PostsListResult> {
        return Promise.resolve([
          pages[index]!,
          pages[index + 1] ? () => load(index + 1) : undefined
        ])
      }
      return createPostsList(() => load(0))
    })
  }

  async function loadSorted(): Promise<PostValue[]> {
    return (await loadPosts()).toSorted((a, b) => {
      return a.originId.localeCompare(b.originId)
    })
  }

  test('puts home timeline posts to feeds and account', async () => {
    let accountId = await addAccount(
      testAccount({ lastPublishedAt: 100, refreshedAt: 10 })
    )
    let virtual = await addFeed(
      testFeed({
        accountId,
        loader: 'mastodon',
        reading: 'slow',
        url: BOB
      })
    )
    await addFilter({
      action: 'delete',
      feedId: virtual,
      query: 'include(spam)'
    })
    await addFeed(
      testFeed({ loader: 'rss', url: 'https://carol.social/@carol' })
    )
    await addFeed(
      testFeed({
        accountId: 'other',
        loader: 'mastodon',
        url: 'https://erin.social/@erin'
      })
    )
    let rss = spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => Promise.resolve([[], undefined]))
    })
    let mastodonFeeds = spyOn(loaders.mastodon, 'getPosts', () => {
      return createPostsList(() => Promise.resolve([[], undefined]))
    })
    let mastodon = loaders.mastodon as Required<typeof loaders.mastodon>
    spyOn(mastodon, 'getThreadAncestors', () =>
      Promise.resolve([{ full: 'Start', originId: 'd0', publishedAt: 240 }])
    )
    let timeline = spyTimeline([
      by('bob', 'b1', { full: 'Hi', publishedAt: 300 }),
      by('bob', 'b2', { full: 'spam', publishedAt: 290 }),
      by('carol', 'c1', { publishedAt: 280 }),
      by('erin', 'e1', { publishedAt: 275 }),
      by('dave', 'd1', { publishedAt: 250, selfReplyTo: 'd0' }),
      by('frank', 'f1', {
        publishedAt: 100,
        repostedBy: { title: 'bob', url: BOB },
        sortedAt: 270
      }),
      by('dave', 'old', { publishedAt: 50 })
    ])

    await refreshPosts()
    equal(timeline.calls[0]![1].account.id, accountId)
    equal(timeline.calls[0]![2], 10)
    equal(rss.calls.length, 1)
    equal(mastodonFeeds.calls.length, 0)
    deepEqual(refreshStatistics.get(), {
      errorFeeds: 0,
      errorRequests: 0,
      foundFast: 2,
      foundSlow: 2,
      initializing: false,
      processedFeeds: 2,
      totalFeeds: 2
    })

    let posts = await loadSorted()
    deepEqual(
      posts.map(i => [
        i.originId,
        i.feedId,
        i.accountId,
        i.reading,
        i.author?.title ?? null,
        i.threadId
      ]),
      [
        ['b1', virtual, null, 'slow', null, null],
        ['d0', null, accountId, 'fast', 'dave', 'd0'],
        ['d1', null, accountId, 'fast', 'dave', 'd0'],
        ['f1', virtual, null, 'slow', 'frank', null]
      ]
    )

    let account = await loadAccount(accountId)
    equal(account!.lastOriginId, 'b1')
    equal(account!.lastPublishedAt, 300)
    let feed = await loadFeed(virtual)
    equal(feed!.lastOriginId, 'b1')
    equal(feed!.lastPublishedAt, 300)
  })

  test('sorts timeline by repost time', async () => {
    let accountId = await addAccount(testAccount({ lastPublishedAt: 200 }))
    spyTimeline([
      by('dave', 'new', { publishedAt: 210 }),
      by('dave', 'reposted', {
        publishedAt: 100,
        repostedBy: { title: 'erin', url: 'https://erin.social/@erin' },
        sortedAt: 300
      }),
      by('dave', 'old', { publishedAt: 150 })
    ])

    await refreshPosts()
    deepEqual(
      (await loadSorted()).map(i => [i.originId, i.sortedAt]),
      [
        ['new', 210],
        ['reposted', 300]
      ]
    )
    let account = await loadAccount(accountId)
    equal(account!.lastOriginId, 'reposted')
    equal(account!.lastPublishedAt, 300)
  })

  test('loads every timeline page', async () => {
    let accountId = await addAccount(testAccount({ lastPublishedAt: 100 }))
    spyTimeline(
      [by('dave', '3', { publishedAt: 300 })],
      [
        by('dave', '2', { publishedAt: 200 }),
        by('dave', '3', { publishedAt: 300 })
      ],
      [by('dave', '1', { publishedAt: 50 })]
    )
    await refreshPosts()
    deepEqual(
      (await loadSorted()).map(i => i.originId),
      ['2', '3']
    )
    equal((await loadAccount(accountId))!.lastOriginId, '3')
  })

  test('loads retry and next timeline page before feeds', async () => {
    await addAccount(testAccount({ lastPublishedAt: 100 }))
    for (let i = 1; i <= 7; i++) {
      await addFeed(testFeed({ title: `${i}`, url: `https://${i}.com/` }))
    }
    let calls: string[] = []
    spyOn(signedIn, 'getTimeline', () => {
      return createPostsList(() => {
        calls.push('timeline 1')
        if (calls.length === 1) {
          let headers = new Headers({ 'Retry-After': '0' })
          throw new HTTPStatusError(429, 'timeline', 'Rate limited', headers)
        }
        return Promise.resolve([
          [by('dave', '2', { publishedAt: 200 })],
          () => {
            calls.push('timeline 2')
            return Promise.resolve([
              [by('dave', '1', { publishedAt: 150 })],
              undefined
            ])
          }
        ])
      })
    })
    spyOn(loaders.rss, 'getPosts', (task, url) => {
      calls.push(url)
      return createPostsList(async () => {
        await setTimeout(10)
        return [[], undefined]
      })
    })
    await refreshPosts()
    deepEqual(calls, [
      'timeline 1',
      'https://1.com/',
      'https://2.com/',
      'https://3.com/',
      'https://4.com/',
      'https://5.com/',
      'timeline 1',
      'timeline 2',
      'https://6.com/',
      'https://7.com/'
    ])
  })

  test('retries internal server error after other feeds', async () => {
    for (let i = 1; i <= 8; i++) {
      await addFeed(testFeed({ title: `${i}`, url: `https://${i}.com/` }))
    }
    let calls: string[] = []
    let failed = false
    spyOn(loaders.rss, 'getPosts', (task, url) => {
      calls.push(url)
      return createPostsList(async () => {
        await setTimeout(10)
        if (url === 'https://1.com/' && !failed) {
          failed = true
          throw new HTTPStatusError(500, url, 'Error', new Headers())
        }
        return [[], undefined]
      })
    })
    await refreshPosts()
    deepEqual(calls, [
      'https://1.com/',
      'https://2.com/',
      'https://3.com/',
      'https://4.com/',
      'https://5.com/',
      'https://6.com/',
      'https://7.com/',
      'https://8.com/',
      'https://1.com/'
    ])
    equal(refreshStatus.get(), 'done')
  })

  test('loads only the newest timeline page on the first refresh', async () => {
    let accountId = await addAccount(testAccount())
    let timeline = spyTimeline(
      [by('dave', '2', { publishedAt: 200 })],
      [by('dave', '1', { publishedAt: 100 })]
    )
    await refreshPosts()
    deepEqual(
      (await loadSorted()).map(i => i.originId),
      ['2']
    )
    let account = await loadAccount(accountId)
    equal(account!.lastOriginId, '2')
    equal(account!.lastPublishedAt, 200)

    timeline.restore()
    spyTimeline(
      [by('dave', '4', { publishedAt: 400 })],
      [by('dave', '3', { publishedAt: 300 })],
      [by('dave', '2', { publishedAt: 200 })]
    )
    await refreshPosts()
    deepEqual(
      (await loadSorted()).map(i => i.originId),
      ['2', '3', '4']
    )
  })

  test('marks account without new posts', async () => {
    let accountId = await addAccount(
      testAccount({ lastOriginId: 'old', lastPublishedAt: 100 })
    )
    spyTimeline([by('dave', 'old', { publishedAt: 100 })])
    await refreshPosts()
    let account = await loadAccount(accountId)
    equal(account!.lastOriginId, 'old')
    equal(typeof account!.refreshedAt, 'number')
    deepEqual(await loadPosts(), [])
  })

  test('is ready to account deletion during refreshing', async () => {
    let accountId = await addAccount(testAccount())
    spyOn(signedIn, 'getTimeline', () => {
      return createPostsList(async () => {
        await deleteAccount(accountId)
        return [[by('dave', '1', { publishedAt: 100 })], undefined]
      })
    })
    await refreshPosts()
    deepEqual(await loadPosts(), [])
  })

  test('shows account errors', async () => {
    let accountId = await addAccount(
      testAccount({ title: 'Me', url: 'https://mastodon.social/@me' })
    )
    let error = new ParseError('broken')
    spyOn(signedIn, 'getTimeline', () => {
      return createPostsList(() => Promise.reject(error))
    })
    await expectWarning(() => refreshPosts(), [error])
    deepEqual(refreshErrors.get(), [
      { account: { id: accountId, title: 'Me' }, error }
    ])
  })

  test('loads recent posts of the feed', async () => {
    let feedId = await addFeed(
      testFeed({ lastPublishedAt: 100, loader: 'mastodon', url: BOB })
    )
    spyOn(loaders.mastodon, 'getPosts', () => {
      return createPostsList(() =>
        Promise.resolve([
          [
            { originId: 'old', publishedAt: 50 },
            { originId: 'new', publishedAt: 200 }
          ],
          undefined
        ])
      )
    })
    await loadRecentPosts(feedId)
    deepEqual(
      (await loadPosts()).map(i => i.originId),
      ['new']
    )
    let feed = await loadFeed(feedId)
    equal(feed!.lastOriginId, 'new')
    equal(feed!.lastPublishedAt, 200)

    await loadRecentPosts(feedId)
    equal((await loadPosts()).length, 1)

    await loadRecentPosts('unknown')

    let error = new ParseError('broken')
    spyOn(loaders.mastodon, 'getPosts', () => {
      return createPostsList(() => Promise.reject(error))
    })
    equal(await throws(() => loadRecentPosts(feedId)), error)
  })
})
