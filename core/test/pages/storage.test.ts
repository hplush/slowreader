import { equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { addFeed, testFeed } from '../../index.ts'
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
})
