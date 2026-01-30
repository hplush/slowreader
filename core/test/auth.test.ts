import type { TestServer } from '@logux/server'
import { IS_PASSWORD } from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { equal, notEqual, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  enableTestTime,
  encryptionKey,
  generateCredentials,
  hasPassword,
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
  setTestUser,
  testSession,
  throws
} from './utils.ts'

describe('auth', () => {
  let server: TestServer
  beforeEach(() => {
    server = buildTestServer()
    setupEnvironment({ ...getTestEnvironment(), server })
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

    await signOut()
    equal(typeof client.get(), 'undefined')
    equal(typeof userId.get(), 'undefined')
    equal(typeof encryptionKey.get(), 'undefined')
  })

  test('allows create user', async () => {
    equal(typeof client.get(), 'undefined')

    let credentials = generateCredentials()
    await signUp(credentials)
    equal(hasPassword.get(), true)
    equal(typeof syncServer.get(), 'undefined')
    equal(client.get()!.state, 'connecting')
    equal(typeof testSession, 'string')

    await setTimeout(100)
    equal(client.get()!.connected, true)

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

    await setTimeout(100)
    equal(client.get()!.connected, true)
    equal(server.connected.size, prevClient + 1)

    await signOut()
    await setTimeout(100)
    equal(server.connected.size, prevClient)
    equal(typeof client.get(), 'undefined')
    equal(typeof testSession, 'undefined')

    await signIn(later)
    equal(client.get()!.state, 'connecting')
    await setTimeout(100)
    equal(client.get()!.connected, true)
    equal(userId.get(), later.userId)
    equal(encryptionKey.get(), later.encryptionKey)
    equal(typeof testSession, 'string')

    await setTimeout(100)
    equal(client.get()!.connected, true)
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
