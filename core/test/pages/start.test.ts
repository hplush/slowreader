import type { TestServer } from '@logux/server'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { equal, match, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  enableTestTime,
  generateCredentials,
  hasPassword,
  HTTPStatusError,
  NetworkError,
  router,
  setupEnvironment,
  signOut,
  signUp,
  toSecret,
  userId
} from '../../index.ts'
import {
  expectWarning,
  getTestEnvironment,
  openPage,
  setTestUser
} from '../utils.ts'

describe('start page', () => {
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
    match(page.signError.get()!, /No user found/)

    page.userId.set('1234567890')
    equal(typeof page.signError.get(), 'undefined')
  })

  test('reports about bad connection', async () => {
    let noDomainError = new TypeError('Can not resolve domain')
    server.fetch = () => {
      throw noDomainError
    }

    let credentials = generateCredentials()
    let page = openPage({
      params: {},
      route: 'start'
    })

    page.userId.set(credentials.userId)
    page.secret.set(toSecret(credentials))

    await expectWarning(async () => {
      await page.signIn()
    }, [new NetworkError(noDomainError)])
    equal(page.signingIn.get(), false)
    match(page.signError.get()!, /connection/)
  })

  test('reports about server errors', async () => {
    // @ts-expect-error Hacky mocking for tests
    server.fetch = () => {
      return Promise.resolve({
        headers: new Headers(),
        ok: false,
        status: 500,
        text: () => Promise.resolve('DB is down'),
        url: 'example.com'
      })
    }

    let credentials = generateCredentials()

    await expectWarning(async () => {
      let page = openPage({
        params: {},
        route: 'start'
      })

      page.userId.set(credentials.userId)
      page.secret.set(toSecret(credentials))

      await page.signIn()
      equal(page.signingIn.get(), false)
      match(page.signError.get()!, /try\sagain/)
    }, [new HTTPStatusError(500, 'example.com', 'DB is down', new Headers())])
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
})
