import type { TestServer } from '@logux/server'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { client } from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  openPage,
  setBaseTestRoute,
  waitUntil
} from '../utils.ts'

describe('profile page', () => {
  let server: TestServer
  beforeEach(() => {
    server = buildTestServer()
    enableClientTest({ server })
    setBaseTestRoute({
      params: {},
      route: 'fatal'
    })
  })

  afterEach(async () => {
    await cleanClientTest()
    await cleanAllTables()
  })

  test('deletes users', async () => {
    let page = openPage({
      params: {},
      route: 'cloud'
    })
    equal(page.hasCloud.get(), false)
    equal(client.get()?.state, 'disconnected')

    let signupPage = openPage({ params: {}, route: 'signUp' })
    await signupPage.submit()
    await setTimeout(100)
    equal(signupPage.error.get(), undefined)

    page = openPage({
      params: {},
      route: 'cloud'
    })
    equal(page.hasCloud.get(), true)
    await waitUntil(() => client.get()?.state === 'synchronized')
    equal(page.deletingAccount.get(), false)

    let promise = page.deleteAccount()
    equal(page.deletingAccount.get(), true)

    await promise
    equal(client.get(), undefined)
  })
})
