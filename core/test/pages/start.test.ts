import type { TestServer } from '@logux/server'
import { COMMON_ERRORS } from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { equal, match, notEqual, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  client,
  enableTestTime,
  generateCredentials,
  hasCloud,
  HTTPStatusError,
  NetworkError,
  router,
  setupEnvironment,
  signOut,
  signUpByPassword,
  userId
} from '../../index.ts'
import {
  expectWarning,
  getTestEnvironment,
  openPage,
  openRoute,
  setTestUser,
  waitFor
} from '../utils.ts'

describe('start page', () => {
  let server: TestServer
  beforeEach(() => {
    server = buildTestServer()
    setupEnvironment({ ...getTestEnvironment(), server })
    enableTestTime()
  })

  afterEach(async () => {
    // Without it the page of the test will be mounted during the next test
    openRoute({ params: {}, route: 'signUp' })
    setTestUser(false)
    await server.destroy()
    await cleanAllTables()
  })

  test('starts local mode', async () => {
    let page = openPage({
      params: {},
      route: 'start'
    })

    await page.startLocal()
    ok(client.get()?.clientId.startsWith(userId.get() + ':'))
    equal(client.get()?.state, 'disconnected')
    equal(hasCloud.get(), false)

    await waitFor(router, route => route.route === 'welcome')
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
    page.password.set(credentials.password)

    let promise = page.signInByPassword()
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
    page.password.set(credentials.password)

    await expectWarning(async () => {
      await page.signInByPassword()
    }, [new NetworkError(noDomainError)])
    equal(page.signingIn.get(), false)
    match(page.signError.get()!, /connection/)
  })

  test('reports about too many requests', async () => {
    // @ts-expect-error Hacky mocking for tests
    server.fetch = () => {
      return Promise.resolve({
        headers: new Headers(),
        ok: false,
        status: 429,
        text: () => Promise.resolve(COMMON_ERRORS.TOO_MANY_REQUESTS),
        url: 'example.com'
      })
    }

    let credentials = generateCredentials()
    let page = openPage({
      params: {},
      route: 'start'
    })

    page.userId.set(credentials.userId)
    page.password.set(credentials.password)

    await page.signInByPassword()
    match(page.signError.get()!, /try\sagain\slater/)
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
      page.password.set(credentials.password)

      await page.signInByPassword()
      equal(page.signingIn.get(), false)
      match(page.signError.get()!, /try\sagain/)
    }, [new HTTPStatusError(500, 'example.com', 'DB is down', new Headers())])
  })

  test('signs in', async () => {
    let credentials = generateCredentials()
    await signUpByPassword(credentials)
    await signOut()

    let page = openPage({
      params: {},
      route: 'start'
    })
    equal(page.signingIn.get(), false)
    equal(page.signError.get(), undefined)

    page.userId.set(credentials.userId)
    page.password.set(credentials.password)

    let promise = page.signInByPassword()
    equal(page.signingIn.get(), true)

    await promise
    ok(client.get()?.clientId.startsWith(credentials.userId + ':'))
    notEqual(client.get()?.state, 'disconnected')

    await waitFor(router, route => route.route === 'welcome')
  })
})
