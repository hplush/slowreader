import { LoguxError } from '@logux/core'
import type { TestServer } from '@logux/server'
import {
  buildTestServer,
  cleanAllTables,
  cleanSessions
} from '@slowreader/server/test'
import { keepMount } from 'nanostores'
import { equal, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  client,
  currentPage,
  enableTestTime,
  encryptionKey,
  encryptionKeyLost,
  type Environment,
  generateCredentials,
  getEnvironment,
  type ReloginPage,
  router,
  setupEnvironment,
  signUpByPassword,
  syncStatus,
  userId
} from '../../index.ts'
import {
  expectWarning,
  getTestEnvironment,
  openRoute,
  setTestUser,
  waitFor,
  waitUntil
} from '../utils.ts'

async function triggerRelogin(): Promise<{
  credentials: ReturnType<typeof generateCredentials>
  page: ReloginPage
}> {
  let credentials = generateCredentials()
  keepMount(syncStatus)
  keepMount(currentPage)
  await signUpByPassword(credentials)
  openRoute({ params: {}, route: 'about' })

  await cleanSessions()
  let wrongCredentials = new LoguxError('wrong-credentials', undefined, true)
  await expectWarning(async () => {
    client.get()!.node.connection.disconnect()
    client.get()!.node.connection.connect()
    await waitFor(syncStatus, status => status === 'wrongCredentials')
  }, [wrongCredentials])
  equal(currentPage.get().route, 'relogin')
  return { credentials, page: currentPage.get() as ReloginPage }
}

describe('relogin page', () => {
  let server: TestServer
  let environment: Environment
  beforeEach(() => {
    server = buildTestServer()
    environment = getTestEnvironment()
    setupEnvironment({ ...environment, server })
    enableTestTime()
  })

  afterEach(async () => {
    setTestUser(false)
    await server.destroy()
    await cleanAllTables()
  })

  test('shows the form over the loader of the unfinished tasks', async () => {
    let { page } = await triggerRelogin()
    equal(page.hideBusy.get(), true)
  })

  test('signs out', async () => {
    let { page } = await triggerRelogin()
    equal(syncStatus.get(), 'wrongCredentials')

    await page.signOut()
    equal(typeof userId.get(), 'undefined')
    equal(syncStatus.get(), 'local')

    await waitFor(router, route => route.route === 'start')
  })

  test('signs in', async () => {
    let { credentials, page } = await triggerRelogin()
    equal(syncStatus.get(), 'wrongCredentials')
    equal(page.signingIn.get(), false)
    equal(typeof page.signError.get(), 'undefined')

    page.userId.set(credentials.userId)
    page.password.set(credentials.password)

    let promise = page.signInByPassword()
    equal(page.signingIn.get(), true)

    await promise
    ok(client.get()?.clientId.startsWith(credentials.userId + ':'))
    equal(page.signingIn.get(), false)
    equal(typeof page.signError.get(), 'undefined')

    await waitFor(syncStatus, status => status === 'synchronized')
    equal(currentPage.get().route, 'about')
  })

  test('asks to sign in if encryption key was lost', async () => {
    let credentials = generateCredentials()
    keepMount(currentPage)
    await signUpByPassword(credentials)
    openRoute({ params: {}, route: 'about' })

    await environment.saveEncryptionKey(undefined)
    encryptionKey.set(undefined)
    setupEnvironment({ ...environment, server })
    await waitUntil(() => encryptionKeyLost.get())
    equal(client.get(), undefined)
    equal(currentPage.get().route, 'relogin')

    let page = currentPage.get() as ReloginPage
    page.userId.set(credentials.userId)
    page.password.set(credentials.password)
    await page.signInByPassword()
    ok(encryptionKey.get())
    equal(await getEnvironment().loadEncryptionKey(), encryptionKey.get())
    equal(currentPage.get().route, 'about')
    await waitFor(syncStatus, status => status === 'synchronized')
  })

  test('signs out if encryption key was lost', async () => {
    keepMount(currentPage)
    await signUpByPassword(generateCredentials())
    await environment.saveEncryptionKey(undefined)
    encryptionKey.set(undefined)
    setupEnvironment({ ...environment, server })
    await waitUntil(() => encryptionKeyLost.get())

    await (currentPage.get() as ReloginPage).signOut()
    equal(userId.get(), undefined)
  })
})
