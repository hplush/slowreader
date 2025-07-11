import type { TestServer } from '@logux/server'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { equal, match, ok } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  enableTestTime,
  encryptionKey,
  generateCredentials,
  getTestEnvironment,
  hasPassword,
  HTTPRequestError,
  setupEnvironment,
  signIn,
  signOut,
  signUp,
  syncServer,
  useCredentials,
  userId
} from '../index.ts'
import { throws } from './utils.ts'

let server: TestServer
beforeEach(() => {
  server = buildTestServer()
  setupEnvironment({ ...getTestEnvironment(), server })
  enableTestTime()
})

afterEach(async () => {
  await client.get()?.clean()
  client.set(undefined)
  await server.destroy()
  await cleanAllTables()
})

test('has local demo mode', async () => {
  equal(typeof client.get(), 'undefined')

  let credentials = generateCredentials()
  useCredentials(credentials)
  ok(client.get()!.clientId.startsWith(credentials.userId + ':'))
  equal(client.get()!.connected, false)
  equal(userId.get(), credentials.userId)
  equal(encryptionKey.get(), credentials.encryptionKey)
  equal(typeof syncServer.get(), 'undefined')

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

  let prevClient = server.connected.size
  await signUp(credentials)
  equal(hasPassword.get(), true)
  equal(encryptionKey.get(), credentials.encryptionKey)
  equal(typeof syncServer.get(), 'undefined')
  equal(client.get()!.state, 'connecting')

  await setTimeout(100)
  equal(client.get()!.connected, true)
  equal(server.connected.size, prevClient + 1)

  await signOut()
  await setTimeout(100)
  equal(server.connected.size, prevClient)
  equal(typeof client.get(), 'undefined')

  await signIn(credentials)
  equal(client.get()!.state, 'connecting')
  await setTimeout(100)
  equal(client.get()!.connected, true)
  equal(userId.get(), credentials.userId)
  equal(encryptionKey.get(), credentials.encryptionKey)
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
  ok(HTTPRequestError.is(error))
  equal(error.message, 'Invalid credentials')
})

test('reports about bad connection', async () => {
  server.fetch = () => {
    throw new Error('Can not resolve domain')
  }

  let error = await throws(() => signIn(generateCredentials()))
  ok(HTTPRequestError.is(error))
  match(error.message, /network/)
})

test('reports about server errors', async () => {
  // @ts-expect-error Hacky mocking for tests
  server.fetch = () => {
    return {
      ok: false,
      status: 500,
      text: () => Promise.resolve('DB is down')
    }
  }

  let error = await throws(() => signIn(generateCredentials()))
  ok(HTTPRequestError.is(error))
  match(error.message, /try again/)
})
