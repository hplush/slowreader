import type { TestServer } from '@logux/server'
import { signUp as signUpApi } from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { deepEqual, equal, match, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  currentPage,
  enableTestTime,
  generateCredentials,
  hasPassword,
  NetworkError,
  router,
  type SavedPassword,
  setupEnvironment,
  signOut,
  signUp,
  userId,
  validSecret,
  validUserId
} from '../../index.ts'
import {
  expectWarning,
  getTestEnvironment,
  openPage,
  setBaseTestRoute,
  setTestUser
} from '../utils.ts'

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
    route: 'signup'
  })

  equal(page.loading.get(), false)
  equal(typeof page.customServer.get(), 'undefined')

  page.showCustomServer()
  equal(page.customServer.get(), 'server.slowreader.app')

  page.resetCustomServer()
  equal(typeof page.customServer.get(), 'undefined')
})

test('regenerates credentials', () => {
  let page = openPage({
    params: {},
    route: 'signup'
  })

  equal(validUserId(page.userId.get()), undefined)
  equal(validSecret(page.secret.get()), undefined)

  let prevUserId1 = page.userId.get()
  let prevSecret1 = page.secret.get()

  page.regenerate()
  notEqual(page.userId.get(), prevUserId1)
  notEqual(page.secret.get(), prevSecret1)
  equal(validUserId(page.userId.get()), undefined)
  equal(validSecret(page.secret.get()), undefined)

  let startPage = openPage({
    params: {},
    route: 'start'
  })
  startPage.startLocal()

  page = openPage({
    params: {},
    route: 'signup'
  })

  equal(page.userId.get(), userId.get())
  equal(validSecret(page.secret.get()), undefined)

  let prevUserId2 = page.userId.get()
  let prevSecret2 = page.secret.get()

  page.regenerate()
  equal(page.userId.get(), prevUserId2)
  notEqual(page.secret.get(), prevSecret2)
})

test('signs up new user', async () => {
  let page = openPage({
    params: {},
    route: 'signup'
  })

  equal(page.warningStep.get(), false)
  equal(page.signingUp.get(), false)
  equal(page.hideMenu.get(), false)

  let promise = page.submit()
  equal(page.signingUp.get(), true)
  equal(typeof page.error.get(), 'undefined')

  await promise
  equal(typeof page.error.get(), 'undefined')
  equal(page.signingUp.get(), false)
  equal(page.warningStep.get(), true)
  equal(page.hideMenu.get(), true)
  equal(client.get()?.state, 'connecting')

  let user = page.userId.get()
  let secret = page.secret.get()
  page.finish()
  await setTimeout(10)
  equal(router.get().route, 'welcome')

  await signOut()
  let signinPage = openPage({
    params: {},
    route: 'start'
  })
  signinPage.userId.set(user)
  signinPage.secret.set(secret)
  await signinPage.signIn()

  await setTimeout(10)
  equal(router.get().route, 'welcome')

  setBaseTestRoute({
    params: {},
    route: 'signup'
  })
  equal(currentPage.get().route, 'profile')
})

test('signs up local user', async () => {
  let startPage = openPage({
    params: {},
    route: 'start'
  })
  startPage.startLocal()
  let user = userId.get()

  let page = openPage({
    params: {},
    route: 'signup'
  })

  equal(page.warningStep.get(), false)
  equal(page.hideMenu.get(), false)

  await page.submit()
  equal(typeof page.error.get(), 'undefined')
  equal(page.signingUp.get(), false)
  equal(page.warningStep.get(), true)
  equal(page.hideMenu.get(), false)
  equal(client.get()?.state, 'connecting')
  equal(userId.get(), user)
  equal(hasPassword.get(), true)
})

test('reports about bad connection', async () => {
  let noDomainError = new TypeError('Can not resolve domain')
  server.fetch = () => {
    throw noDomainError
  }

  let page = openPage({
    params: {},
    route: 'signup'
  })
  equal(page.error.get(), undefined)

  await expectWarning(async () => {
    await page.submit()
  }, [new NetworkError(noDomainError)])
  equal(page.signingUp.get(), false)
  match(page.error.get()!, /connection/)

  page.showCustomServer()
  equal(page.error.get(), undefined)

  await expectWarning(async () => {
    await page.submit()
  }, [new NetworkError(noDomainError)])
  match(page.error.get()!, /connection/)

  page.regenerate()
  equal(page.error.get(), undefined)
})

test('is ready for sign up from another browser tab', async () => {
  openPage({
    params: {},
    route: 'signup'
  })
  await signUp(generateCredentials())
  await setTimeout(10)
  equal(router.get().route, 'welcome')
})

test('is ready for user ID conflict', async () => {
  let startPage = openPage({
    params: {},
    route: 'start'
  })
  startPage.startLocal()
  let user = userId.get()

  let page = openPage({
    params: {},
    route: 'signup'
  })

  await signUpApi(
    {
      password: generateCredentials().password,
      userId: page.userId.get()
    },
    { fetch: server.fetch }
  )
  await page.submit()

  match(page.error.get()!, /taken/)
  equal(page.signingUp.get(), false)
  equal(page.warningStep.get(), false)
  equal(page.userId.get(), user)
  equal(userId.get(), page.userId.get())
  equal(client.get()?.state, 'disconnected')
})

test('gives a way to save password', async () => {
  let calls: SavedPassword[] = []
  setupEnvironment({
    ...getTestEnvironment(),
    savePassword(fields) {
      calls.push(fields)
      return Promise.resolve()
    },
    server
  })

  let page = openPage({
    params: {},
    route: 'signup'
  })
  let user = page.userId.get()
  let secret = page.secret.get()
  equal(page.warningStep.get(), false)
  deepEqual(calls, [])

  await page.submit()
  deepEqual(calls, [{ secret, userId: user }])

  page.askAgain()
  deepEqual(calls, [
    { secret, userId: user },
    { secret, userId: user }
  ])

  match(page.mailTo.get(), /mailto:/)
  match(page.mailTo.get(), new RegExp(user))
})
