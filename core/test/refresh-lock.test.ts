import type { TestClient, TestServer } from '@logux/server'
import {
  refreshLock as lockAction,
  refreshLocked,
  refreshUnlock,
  refreshUnlocked,
  signIn
} from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  autoRefresh,
  type Credentials,
  enableTestTime,
  generateCredentials,
  getClient,
  hasCloud,
  lastRefresh,
  refreshLock,
  releaseRefreshLock,
  addFeed,
  createPostsList,
  isRefreshing,
  loaders,
  type PostsListResult,
  refreshPosts,
  refreshStatistics,
  refreshStatus,
  refreshTotalProgress,
  requestRefreshLock,
  setupEnvironment,
  signUpByPassword,
  stoppableRefreshing,
  stopRefreshing,
  testFeed,
  userId
} from '../index.ts'
import { splitPassword } from '../lib/keys.ts'
import { exitTestApp, getTestEnvironment, openRoute } from '../test.ts'
import {
  cleanClient,
  createPromise,
  setTestUser,
  startClient,
  waitUntil
} from './utils.ts'

describe('refresh lock', () => {
  let server: TestServer | undefined

  beforeEach(() => {
    server = buildTestServer()
    setupEnvironment({ ...getTestEnvironment(), server })
    enableTestTime()
    openRoute({ params: {}, route: 'home' })
  })

  afterEach(async () => {
    restoreAll()
    stopRefreshing()
    releaseRefreshLock()
    await server?.destroy()
    server = undefined
    await cleanClient()
    setTestUser(false)
    await cleanAllTables()
  })

  async function signUp(): Promise<Credentials> {
    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    await waitUntil(() => getClient().state === 'synchronized')
    return credentials
  }

  async function connectOther(credentials: Credentials): Promise<TestClient> {
    let response = await signIn(
      {
        password: { authKey: splitPassword(credentials.password).authKey },
        userId: credentials.userId
      },
      { fetch: server!.fetch }
    )
    let { session } = await response.json()
    return server!.connect(credentials.userId, { token: session })
  }

  async function disconnect(): Promise<void> {
    let before = server!.connected.size
    getClient().node.connection.disconnect()
    // Late disconnect event of test connection kills the next connection
    await waitUntil(() => server!.connected.size < before)
  }

  async function goOffline(): Promise<void> {
    await disconnect()
    let adding = spyOn(server!, 'addClient', () => 0)
    let unbind = getClient().on('state', () => {
      if (getClient().state === 'connecting') {
        unbind()
        getClient().node.connection.disconnect()
      }
    })
    await getClient().node.connection.connect()
    adding.restore()
  }

  function loseNextMessage(): () => Promise<void> {
    let send = spyOn(getClient().node.connection, 'send', () => {})
    return async () => {
      await waitUntil(() => send.callCount > 0)
      send.restore()
    }
  }

  async function collect(
    device: TestClient,
    cb: () => unknown
  ): Promise<object[]> {
    let actions = await device.collect(async () => {
      await cb()
      await setTimeout(50)
    })
    return actions.filter(i => i.type.startsWith('refresh/'))
  }

  test('takes and releases lock', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    let nodeId = getClient().nodeId

    let lost = 0
    deepEqual(
      await collect(other, async () => {
        equal(
          await requestRefreshLock(() => {
            lost += 1
          }),
          true
        )
      }),
      [refreshLocked({ nodeId })]
    )
    equal(refreshLock.get(), 'mine')

    deepEqual(
      await collect(other, () => {
        releaseRefreshLock()
      }),
      [refreshUnlocked({})]
    )
    equal(refreshLock.get(), 'free')
    releaseRefreshLock()
    equal(lost, 0)
  })

  test('waits for another device', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    await other.process(lockAction({}))
    await waitUntil(() => refreshLock.get() === 'other')

    equal(await requestRefreshLock(() => {}), false)
    equal(refreshLock.get(), 'other')

    lastRefresh.set(0)
    await other.process(refreshUnlock({}))
    await waitUntil(() => refreshLock.get() === 'free')
    ok(Date.now() - lastRefresh.get() < 1000)

    getClient().log.add(refreshUnlocked({}))
    equal(refreshLock.get(), 'free')
  })

  test('keeps refresh on connection loss and asks for lock again', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    let lost = 0
    deepEqual(
      await collect(other, async () => {
        equal(
          await requestRefreshLock(() => {
            lost += 1
          }),
          true
        )
        await disconnect()
      }),
      [refreshLocked({ nodeId: getClient().nodeId }), refreshUnlocked({})]
    )
    equal(refreshLock.get(), 'free')

    deepEqual(
      await collect(other, async () => {
        void getClient().node.connection.connect()
        await waitUntil(() => refreshLock.get() === 'mine')
      }),
      [refreshLocked({ nodeId: getClient().nodeId })]
    )
    equal(lost, 0)
  })

  test('waits for lock through connection loss', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    let lost = loseNextMessage()
    let request = requestRefreshLock(() => {})
    await lost()
    await disconnect()
    equal(refreshLock.get(), 'waiting')

    deepEqual(
      await collect(other, async () => {
        void getClient().node.connection.connect()
        equal(await request, true)
      }),
      [refreshLocked({ nodeId: getClient().nodeId })]
    )
    equal(refreshLock.get(), 'mine')
  })

  test('asks for lock after reconnect', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    await disconnect()
    let request = requestRefreshLock(() => {})
    equal(refreshLock.get(), 'waiting')

    deepEqual(
      await collect(other, async () => {
        void getClient().node.connection.connect()
        equal(await request, true)
      }),
      [refreshLocked({ nodeId: getClient().nodeId })]
    )
  })

  test('goes without lock after failed reconnect', async () => {
    await signUp()
    let lost = loseNextMessage()
    let request = requestRefreshLock(() => {})
    await lost()
    await goOffline()
    equal(await request, true)
    equal(refreshLock.get(), 'free')
  })

  test('refreshes after lock request was lost with connection', async () => {
    let credentials = await signUp()
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let other = await connectOther(credentials)
    let load = spyOn(loaders.rss, 'getPosts', () =>
      createPostsList(() => Promise.resolve([[], undefined]))
    )
    let lost = loseNextMessage()
    let refreshing = refreshPosts()
    await lost()
    await disconnect()
    equal(load.callCount, 0)
    equal(refreshStatus.get(), 'refreshing')

    deepEqual(
      await collect(other, async () => {
        void getClient().node.connection.connect()
        await refreshing
      }),
      [refreshLocked({ nodeId: getClient().nodeId }), refreshUnlocked({})]
    )
    equal(load.callCount, 1)
    equal(refreshStatus.get(), 'done')
  })

  test('waits for reconnect to refresh after connection loss', async () => {
    let credentials = await signUp()
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let other = await connectOther(credentials)
    let load = spyOn(loaders.rss, 'getPosts', () =>
      createPostsList(() => Promise.resolve([[], undefined]))
    )
    await disconnect()

    let refreshing = refreshPosts()
    await setTimeout(50)
    equal(load.callCount, 0)
    equal(refreshStatistics.get().initializing, 'sync')

    deepEqual(
      await collect(other, async () => {
        void getClient().node.connection.connect()
        await refreshing
      }),
      [refreshLocked({ nodeId: getClient().nodeId }), refreshUnlocked({})]
    )
    equal(load.callCount, 1)
  })

  test('does not refresh if another device took lock during reconnect', async () => {
    let credentials = await signUp()
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let other = await connectOther(credentials)
    let load = spyOn(loaders.rss, 'getPosts', () =>
      createPostsList(() => Promise.resolve([[], undefined]))
    )
    await disconnect()

    let refreshing = refreshPosts()
    await other.process(lockAction({}))
    void getClient().node.connection.connect()
    await refreshing
    equal(load.callCount, 0)
    equal(refreshStatus.get(), 'other')
  })

  test('stops refresh if another device took lock during reconnect', async () => {
    let credentials = await signUp()
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let other = await connectOther(credentials)
    let loading = createPromise<PostsListResult>()
    let load = spyOn(loaders.rss, 'getPosts', () =>
      createPostsList(() => loading.promise())
    )
    let refreshing = refreshPosts()
    await waitUntil(() => load.callCount === 1)
    await disconnect()
    equal(refreshStatus.get(), 'refreshing')

    await other.process(lockAction({}))
    void getClient().node.connection.connect()
    await waitUntil(() => refreshStatus.get() === 'other')
    loading.resolve([[], undefined])
    await refreshing
  })

  test('forgets lock of another device on connection loss', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    await other.process(lockAction({}))
    await waitUntil(() => refreshLock.get() === 'other')

    await disconnect()
    equal(refreshLock.get(), 'free')
    equal(refreshStatus.get(), 'no')
    void getClient().node.connection.connect()
    await waitUntil(() => refreshStatus.get() === 'other')

    await disconnect()
    await other.process(refreshUnlock({}))
    void getClient().node.connection.connect()
    await waitUntil(() => getClient().state === 'synchronized')
    equal(refreshLock.get(), 'free')
  })

  test('waits for another device asking at the same moment', async t => {
    await signUp()
    t.after(
      refreshLock.listen(lock => {
        if (lock === 'waiting') {
          queueMicrotask(() => {
            void getClient().log.add(refreshLocked({ nodeId: 'other:1:1' }))
          })
        }
      })
    )
    await refreshPosts()
    equal(refreshStatus.get(), 'other')
    equal(refreshLock.get(), 'other')
  })

  test('loses lock after server unlock', async () => {
    await signUp()
    let lost = 0
    await requestRefreshLock(() => {
      lost += 1
    })
    await getClient().log.add(refreshUnlocked({}))
    equal(refreshLock.get(), 'free')
    equal(lost, 1)

    await requestRefreshLock(() => {
      lost += 1
    })
    await getClient().log.add(refreshLocked({ nodeId: getClient().nodeId }))
    equal(refreshLock.get(), 'mine')
    await getClient().log.add(refreshLocked({ nodeId: 'other:1:1' }))
    equal(refreshLock.get(), 'other')
    equal(lost, 2)
  })

  test('unlocks on exit', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    deepEqual(await collect(other, () => requestRefreshLock(() => {})), [
      refreshLocked({ nodeId: getClient().nodeId })
    ])

    deepEqual(
      await collect(other, () => {
        exitTestApp()
      }),
      [refreshUnlocked({})]
    )
    releaseRefreshLock()
    exitTestApp()
  })

  test('refreshes without lock offline', async () => {
    let credentials = await signUp()
    await goOffline()
    let lost = 0
    equal(
      await requestRefreshLock(() => {
        lost += 1
      }),
      true
    )
    equal(refreshLock.get(), 'free')

    let other = await connectOther(credentials)
    await other.process(lockAction({}))
    void getClient().node.connection.connect()
    await waitUntil(() => lost === 1)
    equal(refreshLock.get(), 'other')
  })

  test('asks for lock after reconnect during refresh', async () => {
    let credentials = await signUp()
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let other = await connectOther(credentials)
    let loading = createPromise<PostsListResult>()
    spyOn(loaders.rss, 'getPosts', () =>
      createPostsList(() => loading.promise())
    )
    await goOffline()

    let refreshing = refreshPosts()
    deepEqual(
      await collect(other, async () => {
        await waitUntil(() => refreshStatistics.get().totalFeeds === 1)
        void getClient().node.connection.connect()
        await waitUntil(() => refreshLock.get() === 'mine')
      }),
      [refreshLocked({ nodeId: getClient().nodeId })]
    )
    equal(refreshStatus.get(), 'refreshing')

    deepEqual(
      await collect(other, async () => {
        loading.resolve([[], undefined])
        await refreshing
      }),
      [refreshUnlocked({})]
    )
    equal(refreshStatus.get(), 'done')
  })

  test('unlocks if refresh was finished before the answer', async () => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    await goOffline()
    await requestRefreshLock(() => {})

    deepEqual(
      await collect(other, async () => {
        void getClient().node.connection.connect()
        await getClient().waitFor('synchronized')
        releaseRefreshLock()
      }),
      [refreshLocked({ nodeId: getClient().nodeId }), refreshUnlocked({})]
    )
    equal(refreshLock.get(), 'free')
  })

  test('refreshes posts under lock', async () => {
    let env = getTestEnvironment()
    let states: string[] = []
    setupEnvironment({
      ...env,
      mediaCache: {
        ...env.mediaCache,
        keys() {
          states.push(refreshLock.get())
          return env.mediaCache.keys()
        }
      },
      server: server!
    })
    enableTestTime()
    let credentials = await signUp()
    let other = await connectOther(credentials)
    let nodeId = getClient().nodeId

    deepEqual(await collect(other, () => refreshPosts()), [
      refreshLocked({ nodeId }),
      refreshUnlocked({})
    ])
    deepEqual(states, ['free'])

    await other.process(lockAction({}))
    await waitUntil(() => refreshStatus.get() === 'other')
    deepEqual(refreshTotalProgress.get(), { stage: 'other' })
    equal(isRefreshing.get(), true)
    equal(stoppableRefreshing.get(), false)
    await refreshPosts()
    equal(refreshStatus.get(), 'other')
    stopRefreshing()
    equal(refreshStatus.get(), 'other')
    equal(refreshLock.get(), 'other')
    await other.process(refreshUnlock({}))
    await waitUntil(() => refreshStatus.get() === 'no')
  })

  test('releases lock after stop during waiting', async t => {
    let credentials = await signUp()
    let other = await connectOther(credentials)
    let nodeId = getClient().nodeId
    deepEqual(
      await collect(other, async () => {
        t.after(
          refreshLock.listen(lock => {
            if (lock === 'waiting') {
              deepEqual(refreshTotalProgress.get(), { stage: 'waiting' })
              equal(refreshStatistics.get().initializing, 'lock')
              stopRefreshing()
            }
          })
        )
        await refreshPosts()
      }),
      [refreshLocked({ nodeId }), refreshUnlocked({})]
    )
    equal(refreshLock.get(), 'free')
  })

  test('continues refresh on connection loss', async () => {
    await signUp()
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let loading = createPromise<PostsListResult>()
    spyOn(loaders.rss, 'getPosts', () =>
      createPostsList(() => loading.promise())
    )
    let refreshing = refreshPosts()
    await waitUntil(() => refreshLock.get() === 'mine')
    getClient().node.connection.disconnect()
    await waitUntil(() => refreshLock.get() === 'free')
    equal(refreshStatus.get(), 'refreshing')
    loading.resolve([[], undefined])
    await refreshing
    equal(refreshStatus.get(), 'done')
  })

  test('does not resend offline lock request', async () => {
    let credentials = await signUp()
    getClient().node.connection.disconnect()
    await waitUntil(() => getClient().state === 'disconnected')
    await getClient().log.add(lockAction({}), { sync: true })
    await getClient().log.add(refreshUnlock({}), { sync: true })
    let stored: string[] = []
    await getClient().log.each((action: { type: string }) => {
      stored.push(action.type)
    })
    deepEqual(
      stored.filter(i => i.startsWith('refresh/')),
      []
    )

    let other = await connectOther(credentials)
    deepEqual(
      await collect(other, async () => {
        void getClient().node.connection.connect()
        await waitUntil(() => getClient().state === 'synchronized')
      }),
      []
    )
  })

  test('asks for lock again after leader tab closing', async t => {
    let credentials = await signUp()
    let other = await connectOther(credentials)

    // Another tab is the leader and it is synchronized
    let saved: Record<string, string> = {
      [`slowreader:${credentials.userId}:state`]: '"synchronized"'
    }
    let origin = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => saved[key] ?? null,
        removeItem(key: string) {
          delete saved[key]
        },
        setItem(key: string, value: string) {
          saved[key] = value
        }
      }
    })
    autoRefresh.set('always')
    t.after(() => {
      Object.defineProperty(globalThis, 'localStorage', origin)
      autoRefresh.set('never')
    })

    lastRefresh.set(0)
    userId.set(undefined)
    deepEqual(
      await collect(other, async () => {
        // Leader tab is closed before it sent the request to the server
        void navigator.locks.request('logux_leader', () => setTimeout(1))
        userId.set(credentials.userId)
        equal(getClient().state, 'synchronized')
        await waitUntil(() => refreshStatus.get() === 'no')
      }),
      [refreshLocked({ nodeId: getClient().nodeId }), refreshUnlocked({})]
    )
    equal(refreshLock.get(), 'free')
  })

  test('refreshes without lock without cloud', async () => {
    startClient()
    equal(hasCloud.get(), false)
    equal(await requestRefreshLock(() => {}), true)
    equal(refreshLock.get(), 'free')
  })

  test('stops waiting on sign out', async () => {
    await signUp()
    let request = requestRefreshLock(() => {})
    setTestUser(false)
    equal(await request, false)
    equal(refreshLock.get(), 'free')
  })
})
