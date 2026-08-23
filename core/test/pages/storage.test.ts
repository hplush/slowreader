import { deepStrictEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { addFeed, busy, storageMessages, testFeed } from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  openPage,
  waitUntil
} from '../utils.ts'

describe('storage page', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('shows the database size', async () => {
    await addFeed(testFeed())

    let page = openPage({ params: {}, route: 'storage' })
    equal(page.hasCloud.get(), false)
    equal(page.size.get(), undefined)

    await waitUntil(() => typeof page.size.get() !== 'undefined')
    notEqual(page.size.get(), 0)
  })

  test('compacts the database', async () => {
    await addFeed(testFeed())

    let page = openPage({ params: {}, route: 'storage' })
    await waitUntil(() => typeof page.size.get() !== 'undefined')

    let compacting = page.compact()
    deepStrictEqual(busy.get(), {
      blocking: true,
      label: storageMessages.get().compacting,
      progress: undefined
    })
    await compacting
    equal(busy.get(), false)
    notEqual(page.size.get(), 0)
  })
})
