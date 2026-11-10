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
  refreshStatus,
  refreshTotalProgress,
  requestRefreshLock,
  setupEnvironment,
  signUpByPassword,
  stopRefreshing,
  testFeed
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

  test('loses lock with connection', async () => {
    await signUp()
    let lost = 0
    equal(
      await requestRefreshLock(() => {
        lost += 1
      }),
      true
    )
    getClient().node.connection.disconnect()
    await waitUntil(() => refreshLock.get() === 'free')
    equal(lost, 1)
  })

  test('stops waiting on disconnect', async () => {
    await signUp()
    let request = requestRefreshLock(() => {})
    equal(refreshLock.get(), 'waiting')
    getClient().node.connection.disconnect()
    equal(await request, false)
    equal(refreshLock.get(), 'free')
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

  test('refreshes without lock in disconnected state', async () => {
    let credentials = await signUp()
    getClient().node.connection.disconnect()
    await waitUntil(() => getClient().state === 'disconnected')
    let lost = 0
    equal(
      await requestRefreshLock(() => {
        lost += 1
      }),
      true
    )
    equal(refreshLock.get(), 'free')
    await connectOther(credentials)
    void getClient().node.connection.connect()
    await waitUntil(() => lost === 1)
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
    await refreshPosts()
    equal(refreshStatus.get(), 'other')
    await other.process(refreshUnlock({}))
    await waitUntil(() => refreshStatus.get() === 'start')
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

  test('stops refresh on connection loss', async () => {
    await signUp()
    await addFeed(testFeed({ loader: 'rss', url: 'https://one.com/' }))
    let loading = createPromise<PostsListResult>()
    spyOn(loaders.rss, 'getPosts', () =>
      createPostsList(() => loading.promise())
    )
    let refreshing = refreshPosts()
    await waitUntil(() => refreshLock.get() === 'mine')
    getClient().node.connection.disconnect()
    await waitUntil(() => !isRefreshing.get())
    equal(refreshLock.get(), 'free')
    loading.resolve([[], undefined])
    await refreshing
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
