import { LoguxError } from '@logux/core'
import type { TestServer } from '@logux/server'
import { COMMON_ERRORS } from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { keepMount } from 'nanostores'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  currentPage,
  enableTestTime,
  generateCredentials,
  isOutdatedClient,
  setupEnvironment,
  signUp,
  toSecret
} from '../../index.ts'
import {
  expectWarning,
  getTestEnvironment,
  openPage,
  setBaseTestRoute,
  setTestUser
} from '../utils.ts'

function emit(obj: any, event: string, ...args: any[]): void {
  obj.emitter.emit(event, ...args)
}

describe('outdated page', () => {
  let server: TestServer
  beforeEach(() => {
    server = buildTestServer()
    setupEnvironment({ ...getTestEnvironment(), server })
    enableTestTime()
  })

  afterEach(async () => {
    isOutdatedClient.set(false)
    setTestUser(false)
    await server.destroy()
    await cleanAllTables()
  })

  test('opens on wrong-subprotocol error', async () => {
    keepMount(currentPage)
    await signUp(generateCredentials())
    setBaseTestRoute({ params: {}, route: 'about' })

    let wrongSubprotocol = new LoguxError('wrong-subprotocol', {
      supported: 1,
      used: 2
    })
    await expectWarning(async () => {
      emit(client.get()!.node, 'error', wrongSubprotocol)
      await setTimeout(10)
    }, [wrongSubprotocol])

    equal(currentPage.get().route, 'outdated')
  })

  test('opens on OUTDATED_CLIENT HTTP response', async () => {
    keepMount(currentPage)
    setBaseTestRoute({ params: {}, route: 'about' })

    // @ts-expect-error Hacky mocking for tests
    server.fetch = () => {
      return Promise.resolve({
        headers: new Headers(),
        ok: false,
        status: 400,
        text: () => Promise.resolve(COMMON_ERRORS.OUTDATED_CLIENT),
        url: 'example.com'
      })
    }

    let credentials = generateCredentials()
    let page = openPage({ params: {}, route: 'start' })
    page.userId.set(credentials.userId)
    page.secret.set(toSecret(credentials))
    try {
      await page.signIn()
    } catch {}

    equal(isOutdatedClient.get(), true)
    equal(currentPage.get().route, 'outdated')
  })
})
