import type { TestServer } from '@logux/server'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { equal, match, ok } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  enableTestTime,
  generateCredentials,
  hasPassword,
  router,
  setupEnvironment,
  signOut,
  signUp,
  toSecret,
  userId
} from '../../index.ts'
import { getTestEnvironment, openPage, setTestUser } from '../utils.ts'

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

test('shows and hides custom server field', () => {
  let page = openPage({
    params: {},
    route: 'start'
  })

  equal(page.loading.get(), false)
  equal(page.userId.get(), '')
  equal(page.secret.get(), '')
  equal(typeof page.customServer.get(), 'undefined')

  page.showCustomServer()
  equal(page.customServer.get(), 'server.slowreader.app')

  page.resetCustomServer()
  equal(typeof page.customServer.get(), 'undefined')
})

test('starts local mode', async () => {
  let page = openPage({
    params: {},
    route: 'start'
  })

  page.startLocal()
  ok(client.get()?.clientId.startsWith(userId.get() + ':'))
  equal(client.get()?.state, 'disconnected')
  equal(hasPassword.get(), false)

  await setTimeout(10)
  equal(router.get().route, 'welcome')
})

test('reports about wrong credentials', async () => {
  let credentials = generateCredentials()
  let page = openPage({
    params: {},
    route: 'start'
  })
  equal(page.signingIn.get(), false)
  equal(typeof page.signError.get(), 'undefined')

  page.userId.set(credentials.userId)
  page.secret.set(toSecret(credentials))

  let promise = page.signIn()
  equal(page.signingIn.get(), true)
  equal(typeof page.signError.get(), 'undefined')

  await promise
  equal(page.signingIn.get(), false)
  match(page.signError.get()!, /User ID and\spassword/)

  page.userId.set('1234567890')
  equal(typeof page.signError.get(), 'undefined')
})

test('reports about bad connection', async () => {
  server.fetch = () => {
    throw new Error('Can not resolve domain')
  }

  let credentials = generateCredentials()
  let page = openPage({
    params: {},
    route: 'start'
  })

  page.userId.set(credentials.userId)
  page.secret.set(toSecret(credentials))

  await page.signIn()
  equal(page.signingIn.get(), false)
  match(page.signError.get()!, /connection/)
})

test('reports about server errors', async () => {
  // @ts-expect-error Hacky mocking for tests
  server.fetch = () => {
    return Promise.resolve({
      ok: false,
      status: 500,
      text: () => Promise.resolve('DB is down')
    })
  }

  let credentials = generateCredentials()
  let page = openPage({
    params: {},
    route: 'start'
  })

  page.userId.set(credentials.userId)
  page.secret.set(toSecret(credentials))

  await page.signIn()
  equal(page.signingIn.get(), false)
  match(page.signError.get()!, /try\sagain/)
})

test('signs in', async () => {
  let credentials = generateCredentials()
  await signUp(credentials)
  await signOut()

  let page = openPage({
    params: {},
    route: 'start'
  })
  equal(page.signingIn.get(), false)
  equal(typeof page.signError.get(), 'undefined')

  page.userId.set(credentials.userId)
  page.secret.set(toSecret(credentials))

  let promise = page.signIn()
  equal(page.signingIn.get(), true)

  await promise
  ok(client.get()?.clientId.startsWith(credentials.userId + ':'))
  equal(client.get()?.state, 'connecting')

  await setTimeout(10)
  equal(router.get().route, 'welcome')
})
