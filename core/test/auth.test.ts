import type { TestServer } from '@logux/server'
import { IS_PASSWORD } from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  benchmarkStatistics,
  client,
  enableTestTime,
  encryptionKey,
  generateCredentials,
  hasPassword,
  onSignOut,
  router,
  setupEnvironment,
  signIn,
  signOut,
  signUp,
  syncServer,
  useCredentials,
  UserFacingError,
  userId
} from '../index.ts'
import {
  getTestEnvironment,
  setBaseTestRoute,
  setTestUser,
  testSession,
  throws,
  waitUntil
} from './utils.ts'

describe('auth', () => {
  let server: TestServer
  let storage: Record<string, string>
  beforeEach(() => {
    server = buildTestServer()
    let environment = getTestEnvironment()
    storage = environment.persistentStore
    setupEnvironment({ ...environment, server })
    enableTestTime()
  })

  afterEach(async () => {
    setTestUser(false)
    await server.destroy()
    await cleanAllTables()
  })

  test('has local demo mode', async () => {
    equal(typeof client.get(), 'undefined')

    let credentials = generateCredentials()
    ok(IS_PASSWORD.test(credentials.password))

    useCredentials(credentials)
    ok(client.get()!.clientId.startsWith(credentials.userId + ':'))
    equal(client.get()!.connected, false)
    equal(userId.get(), credentials.userId)
    equal(encryptionKey.get(), credentials.encryptionKey)
    equal(typeof syncServer.get(), 'undefined')
    equal(typeof testSession, 'undefined')
    setBaseTestRoute({ params: {}, route: 'cloud' })

    let cleaned = 0
    let unbindSignOut = onSignOut(() => {
      cleaned += 1
    })
    onSignOut(() => {
      cleaned += 10
    })()

    // Benchmark data of the previous start
    let statistics = {
      biggestCategory: 'category',
      debug: false,
      duration: 100,
      feeds: 10,
      posts: 100,
      readerFeed: 'feed',
      slowFeeds: ['feed']
    }
    storage['slowreader:benchmark'] = JSON.stringify(statistics)
    let unbindStatistics = benchmarkStatistics.listen(() => {})
    deepEqual(benchmarkStatistics.get(), statistics)

    // Benchmark saved new data during the session
    let newStatistics = { ...statistics, feeds: 20 }
    benchmarkStatistics.set(newStatistics)
    equal(storage['slowreader:benchmark'], JSON.stringify(newStatistics))

    await signOut()
    equal(router.get().route, 'start')
    equal(typeof client.get(), 'undefined')
    equal(typeof userId.get(), 'undefined')
    equal(typeof encryptionKey.get(), 'undefined')
    equal(typeof benchmarkStatistics.get(), 'undefined')
    equal(typeof storage['slowreader:benchmark'], 'undefined')
    equal(cleaned, 1)
    unbindStatistics()
    unbindSignOut()
  })

  test('allows create user', async () => {
    equal(typeof client.get(), 'undefined')

    let credentials = generateCredentials()
    await signUp(credentials)
    equal(hasPassword.get(), true)
    equal(typeof syncServer.get(), 'undefined')
    equal(client.get()!.state, 'connecting')
    equal(typeof testSession, 'string')

    await waitUntil(() => client.get()!.connected)

    await signOut()
    equal(typeof client.get(), 'undefined')
    equal(typeof userId.get(), 'undefined')
    equal(typeof encryptionKey.get(), 'undefined')
  })

  test('allows to create user from local mode', async () => {
    let credentials = generateCredentials()
    useCredentials(credentials)
    ok(client.get()!.clientId.startsWith(credentials.userId + ':'))
    equal(userId.get(), credentials.userId)
    equal(hasPassword.get(), false)
    equal(client.get()!.connected, false)

    let later = generateCredentials(
      credentials.userId,
      credentials.encryptionKey
    )
    equal(later.userId, credentials.userId)
    equal(later.encryptionKey, credentials.encryptionKey)
    notEqual(later.password, credentials.password)

    let prevClient = server.connected.size
    await signUp(later)
    equal(hasPassword.get(), true)
    equal(encryptionKey.get(), later.encryptionKey)
    equal(typeof syncServer.get(), 'undefined')
    equal(client.get()!.state, 'connecting')
    equal(typeof testSession, 'string')

    await waitUntil(() => client.get()!.connected)
    equal(server.connected.size, prevClient + 1)

    await signOut()
    await waitUntil(() => server.connected.size === prevClient)
    equal(typeof client.get(), 'undefined')
    equal(typeof testSession, 'undefined')

    await signIn(later)
    equal(client.get()!.state, 'connecting')
    await waitUntil(() => client.get()!.connected)
    equal(userId.get(), later.userId)
    equal(encryptionKey.get(), later.encryptionKey)
    equal(typeof testSession, 'string')

    await waitUntil(() => client.get()!.connected)
  })

  test('remembers custom server', async () => {
    // @ts-expect-error Hacky mocking for tests
    server.fetch = () => {
      return {
        json: () => ({}),
        ok: true
      }
    }

    let credentials = generateCredentials()
    await signUp(credentials, 'https://example.com')
    equal(syncServer.get(), 'https://example.com')

    await signOut()
    equal(typeof syncServer.get(), 'undefined')
  })

  test('reports about wrong credentials', async () => {
    let error = await throws(() => signIn(generateCredentials()))
    ok(error instanceof UserFacingError)
    equal(error.message, 'Invalid credentials')
  })
})
