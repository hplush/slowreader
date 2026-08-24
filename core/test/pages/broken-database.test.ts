import { cleanStores, keepMount } from 'nanostores'
import { equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  currentPage,
  forgetLocalData,
  getEnvironment,
  getClient,
  brokenDatabase,
  lastReset,
  resetDatabase,
  userId
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  expectWarning,
  getTestEnvironment,
  setBaseTestRoute
} from '../utils.ts'

describe('broken database page', () => {
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
    equal(brokenDatabase.get(), undefined)
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
    equal(currentPage.get().route, 'brokenDatabase')
    // The page shows the failure, which is happening now, not the previous try
    equal(brokenDatabase.get()!.error, 'Disk image is malformed')
    notEqual(brokenDatabase.get()!.at, lastReset.get()!.at)
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
    equal(brokenDatabase.get(), undefined)
  })

  test('forgets the local data without asking the database', () => {
    forgetLocalData()
    equal(userId.get(), undefined)
    equal(restarts, 1)
  })
})
