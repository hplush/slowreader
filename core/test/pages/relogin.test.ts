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
import { setTimeout } from 'node:timers/promises'

import {
  client,
  currentPage,
  enableTestTime,
  generateCredentials,
  type ReloginPage,
  router,
  setupEnvironment,
  signUp,
  syncStatus,
  toSecret,
  userId
} from '../../index.ts'
import {
  expectWarning,
  getTestEnvironment,
  setBaseTestRoute,
  setTestUser
} from '../utils.ts'

async function triggerRelogin(): Promise<{
  credentials: ReturnType<typeof generateCredentials>
  page: ReloginPage
}> {
  let credentials = generateCredentials()
  keepMount(syncStatus)
  keepMount(currentPage)
  await signUp(credentials)
  setBaseTestRoute({ params: {}, route: 'about' })

  await cleanSessions()
  let wrongCredentials = new LoguxError('wrong-credentials', undefined, true)
  await expectWarning(async () => {
    client.get()!.node.connection.disconnect()
    client.get()!.node.connection.connect()
    await setTimeout(100)
  }, [wrongCredentials])
  equal(currentPage.get().route, 'relogin')
  return { credentials, page: currentPage.get() as ReloginPage }
}

describe('relogin page', () => {
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

  test('signs out', async () => {
    let { page } = await triggerRelogin()
    equal(syncStatus.get(), 'wrongCredentials')

    await page.signOut()
    equal(typeof userId.get(), 'undefined')
    equal(syncStatus.get(), 'local')

    await setTimeout(10)
    equal(router.get().route, 'start')
  })

  test('signs in', async () => {
    let { credentials, page } = await triggerRelogin()
    equal(syncStatus.get(), 'wrongCredentials')
    equal(page.signingIn.get(), false)
    equal(typeof page.signError.get(), 'undefined')

    page.userId.set(credentials.userId)
    page.secret.set(toSecret(credentials))

    let promise = page.signIn()
    equal(page.signingIn.get(), true)

    await promise
    ok(client.get()?.clientId.startsWith(credentials.userId + ':'))
    equal(page.signingIn.get(), false)
    equal(typeof page.signError.get(), 'undefined')

    await setTimeout(500)
    equal(syncStatus.get(), 'synchronized')
    equal(currentPage.get().route, 'about')
  })
})
