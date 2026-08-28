import { LoguxError } from '@logux/core'
import type { TestServer } from '@logux/server'
import { COMMON_ERRORS } from '@slowreader/api'
import { buildTestServer, cleanAllTables } from '@slowreader/server/test'
import { cleanStores, keepMount } from 'nanostores'
import { deepEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  client,
  currentPage,
  enableTestTime,
  fatal,
  forgetLocalData,
  generateCredentials,
  getClient,
  getEnvironment,
  lastReset,
  resetDatabase,
  setupEnvironment,
  signUp,
  toSecret,
  userId
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  expectWarning,
  getTestEnvironment,
  openPage,
  setBaseTestRoute,
  setTestUser
} from '../utils.ts'

function emit(obj: any, event: string, ...args: any[]): void {
  obj.emitter.emit(event, ...args)
}

describe('fatal page', () => {
  describe('reason', () => {
    beforeEach(() => {
      enableClientTest()
    })

    afterEach(async () => {
      await cleanClientTest()
    })

    test('shows not found on the unknown URL', () => {
      let page = openPage({ params: {}, route: 'fatal' })
      deepEqual(page.reason.get(), { type: 'notFound' })

      fatal.set({ error: 'Disk image is malformed', type: 'brokenDatabase' })
      deepEqual(page.reason.get(), {
        error: 'Disk image is malformed',
        type: 'brokenDatabase'
      })
    })

    test('opens the error design by the URL', () => {
      let page = openPage({ params: { reason: 'outdated' }, route: 'fatal' })
      deepEqual(page.reason.get(), { type: 'outdated' })

      setBaseTestRoute({ params: { reason: 'brokenDatabase' }, route: 'fatal' })
      deepEqual(page.reason.get(), {
        error: 'Test page',
        type: 'brokenDatabase'
      })

      // The unknown reason is the same broken URL as any other
      setBaseTestRoute({ params: { reason: 'unknown' }, route: 'fatal' })
      deepEqual(page.reason.get(), { type: 'notFound' })
    })
  })

  describe('broken database', () => {
    let restarts: number

    beforeEach(() => {
      restarts = 0
      enableClientTest({
        restartApp() {
          restarts += 1
        }
      })
    })

    afterEach(async () => {
      lastReset.set(undefined)
      await cleanClientTest()
    })

    test('opens when the reset did not fix the database', async () => {
      keepMount(currentPage)
      setBaseTestRoute({ params: {}, route: 'about' })

      await resetDatabase(
        'broken-db',
        new Error('Database disk image is malformed')
      )
      equal(restarts, 1)
      equal(fatal.get(), undefined)
      equal(currentPage.get().route, 'about')
      // The page shows the error, which broke the database, for the bug report
      equal(lastReset.get()!.error, 'Database disk image is malformed')
    })

    test('opens when the reset of the previous start did not help', async () => {
      lastReset.set({ at: new Date(), reason: 'broken-db' })
      let environment = getTestEnvironment()
      environment.persistentStore['slowreader:reset'] =
        getEnvironment().persistentStore['slowreader:reset']!
      // Forget the value in the memory, so the store will read the storage
      lastReset.set(undefined)
      cleanStores(lastReset)
      enableClientTest({
        ...environment,
        restartApp() {
          restarts += 1
        }
      })
      keepMount(currentPage)
      setBaseTestRoute({ params: {}, route: 'about' })

      await resetDatabase('broken-db', new Error('Disk image is malformed'))

      equal(restarts, 0)
      equal(currentPage.get().route, 'fatal')
      // The page shows the failure, which is happening now, not the previous try
      deepEqual(fatal.get(), {
        error: 'Disk image is malformed',
        type: 'brokenDatabase'
      })
      notEqual(lastReset.get()!.error, 'Disk image is malformed')
    })

    test('restarts the app even when the cleaning failed', async () => {
      let error = new Error('Broken database')
      let logux = getClient()
      let clean = logux.clean.bind(logux)
      // Only the reset must see the broken cleaning, not the test’s own
      logux.clean = () => {
        logux.clean = clean
        return Promise.reject(error)
      }

      await expectWarning(() => resetDatabase('broken-db'), [error])

      equal(restarts, 1)
      equal(fatal.get(), undefined)
    })

    test('forgets the local data without asking the database', () => {
      forgetLocalData()
      equal(userId.get(), undefined)
      equal(restarts, 1)
    })
  })

  describe('outdated client', () => {
    let server: TestServer
    beforeEach(() => {
      server = buildTestServer()
      setupEnvironment({ ...getTestEnvironment(), server })
      enableTestTime()
    })

    afterEach(async () => {
      fatal.set(undefined)
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

      equal(currentPage.get().route, 'fatal')
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

      deepEqual(fatal.get(), { type: 'outdated' })
      equal(currentPage.get().route, 'fatal')
    })
  })
})
