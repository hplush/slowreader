import type { TestServer } from '@logux/server'
import { signUp as signUpApi } from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { keepMount } from 'nanostores'
import { deepEqual, equal, match, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  busy,
  client,
  commonMessages,
  currentPage,
  enableTestTime,
  generateCredentials,
  hasCloud,
  NetworkError,
  router,
  type SavedPassword,
  setupEnvironment,
  signOut,
  signUpByPassword,
  testFeed,
  userId,
  validPassword,
  validUserId
} from '../../index.ts'
import {
  expectWarning,
  getTestEnvironment,
  openPage,
  persistentDatabase,
  openRoute,
  setTestUser,
  waitFor
} from '../utils.ts'

describe('signup page', () => {
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

  test('regenerates credentials', async () => {
    let page = openPage({
      params: {},
      route: 'signUp'
    })

    equal(validUserId(page.userId.get()), undefined)
    equal(validPassword(page.password.get()), undefined)

    let prevUserId1 = page.userId.get()
    let prevPassword1 = page.password.get()

    page.regenerate()
    notEqual(page.userId.get(), prevUserId1)
    notEqual(page.password.get(), prevPassword1)
    equal(validUserId(page.userId.get()), undefined)
    equal(validPassword(page.password.get()), undefined)

    let startPage = openPage({
      params: {},
      route: 'start'
    })
    await startPage.startLocal()

    page = openPage({
      params: {},
      route: 'signUp'
    })

    equal(page.userId.get(), userId.get())
    equal(validPassword(page.password.get()), undefined)

    let prevUserId2 = page.userId.get()
    let prevPassword2 = page.password.get()

    page.regenerate()
    equal(page.userId.get(), prevUserId2)
    notEqual(page.password.get(), prevPassword2)
  })

  test('signs up new user', async () => {
    let page = openPage({
      params: {},
      route: 'signUp'
    })

    deepEqual(page.step.get(), { type: 'form' })
    equal(page.usePassword.get(), true)
    equal(page.signingUp.get(), false)
    equal(page.hideMenu.get(), false)
    equal(page.hideBusy.get(), false)

    let promise = page.submit()
    equal(page.signingUp.get(), true)
    equal(page.hideBusy.get(), true)
    equal(typeof page.error.get(), 'undefined')

    await promise
    equal(typeof page.error.get(), 'undefined')
    equal(page.signingUp.get(), false)
    deepEqual(page.step.get(), { type: 'password' })
    equal(page.hideMenu.get(), true)
    equal(page.hideBusy.get(), true)
    equal(client.get()?.state, 'connecting')

    let user = page.userId.get()
    let password = page.password.get()
    page.finish()
    await waitFor(router, route => route.route === 'welcome')

    await signOut()
    let signinPage = openPage({
      params: {},
      route: 'start'
    })
    signinPage.userId.set(user)
    signinPage.password.set(password)
    await signinPage.signInByPassword()

    await waitFor(router, route => route.route === 'welcome')

    openRoute({
      params: {},
      route: 'signUp'
    })
    equal(currentPage.get().route, 'cloud')
  })

  test('signs up local user', async () => {
    let startPage = openPage({
      params: {},
      route: 'start'
    })
    await startPage.startLocal()
    let user = userId.get()

    let page = openPage({
      params: {},
      route: 'signUp'
    })

    deepEqual(page.step.get(), { type: 'form' })
    equal(page.hideMenu.get(), false)

    await page.submit()
    equal(typeof page.error.get(), 'undefined')
    equal(page.signingUp.get(), false)
    equal(page.step.get().type, 'password')
    equal(page.hideMenu.get(), false)
    equal(page.hideBusy.get(), true)
    equal(client.get()?.state, 'connecting')
    equal(userId.get(), user)
    equal(hasCloud.get(), true)
  })

  test('hides busy until the second step is closed', async () => {
    setupEnvironment({
      ...getTestEnvironment(),
      databaseCreator: persistentDatabase(),
      server
    })
    let startPage = openPage({
      params: {},
      route: 'start'
    })
    await startPage.startLocal()
    await addFeed(testFeed())

    let page = openPage({
      params: {},
      route: 'signUp'
    })
    keepMount(currentPage)
    let shown: string[] = []
    function check(): void {
      let task = busy.get()
      if (task && !currentPage.get().hideBusy.get()) shown.push(task.label)
    }
    let unbinds = [
      busy.listen(check),
      page.hideBusy.listen(check),
      currentPage.listen(check)
    ]

    await page.submit()
    equal(page.step.get().type, 'password')
    let uploading = commonMessages.get().uploadingData
    await waitFor(busy, task => task !== false && task.label === uploading)
    await waitFor(busy, task => task === false)
    deepEqual(shown, [])

    page.finish()
    equal(currentPage.get().hideBusy.get(), false)
    for (let unbind of unbinds) unbind()
  })

  test('reports about bad connection', async () => {
    let noDomainError = new TypeError('Can not resolve domain')
    server.fetch = () => {
      throw noDomainError
    }

    let page = openPage({
      params: {},
      route: 'signUp'
    })
    equal(page.error.get(), undefined)

    await expectWarning(async () => {
      await page.submit()
    }, [new NetworkError(noDomainError)])
    equal(page.signingUp.get(), false)
    match(page.error.get()!, /connection/)

    page.regenerate()
    equal(page.error.get(), undefined)
  })

  test('is ready for sign up from another browser tab', async () => {
    openPage({
      params: {},
      route: 'signUp'
    })
    await signUpByPassword(generateCredentials())
    await waitFor(router, route => route.route === 'welcome')
  })

  test('is ready for user ID conflict', async () => {
    let startPage = openPage({
      params: {},
      route: 'start'
    })
    await startPage.startLocal()
    let user = userId.get()

    let page = openPage({
      params: {},
      route: 'signUp'
    })

    await signUpApi(
      {
        password: { authKey: 'A'.repeat(22), lockedKey: 'L'.repeat(80) },
        userId: page.userId.get()
      },
      { fetch: server.fetch }
    )
    await page.submit()

    match(page.error.get()!, /taken/)
    equal(page.signingUp.get(), false)
    deepEqual(page.step.get(), { type: 'form' })
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
      route: 'signUp'
    })
    let user = page.userId.get()
    let password = page.password.get()
    deepEqual(page.step.get(), { type: 'form' })
    deepEqual(calls, [])

    await page.submit()
    deepEqual(calls, [{ password, userId: user }])

    await page.askAgain()
    deepEqual(calls, [
      { password, userId: user },
      { password, userId: user }
    ])

    match(page.mailTo.get(), /mailto:/)
    match(page.mailTo.get(), new RegExp(user))
  })
})
