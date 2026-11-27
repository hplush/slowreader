import type { TestServer } from '@logux/server'
import { buildTestServer, closeDb } from '@slowreader/server/test'
import { equal, ok } from 'node:assert/strict'
import { after, afterEach, beforeEach, describe, test } from 'node:test'

import {
  client,
  enableTestTime,
  hasCloud,
  router,
  setupEnvironment,
  userId
} from '../../index.ts'
import {
  getTestEnvironment,
  openPage,
  openRoute,
  setTestUser,
  waitFor
} from '../utils.ts'

after(closeDb)

describe('forgot password page', () => {
  let server: TestServer
  beforeEach(() => {
    server = buildTestServer()
    setupEnvironment({ ...getTestEnvironment(), server })
    enableTestTime()
  })

  afterEach(async () => {
    openRoute({ params: {}, route: 'signUp' })
    setTestUser(false)
    await server.destroy()
  })

  test('starts empty local account', async () => {
    let page = openPage({
      params: {},
      route: 'forgotPassword'
    })

    await page.startLocal()
    ok(client.get()?.clientId.startsWith(userId.get() + ':'))
    equal(hasCloud.get(), false)

    await waitFor(router, route => route.route === 'welcome')
  })
})
