import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { isOutdatedClient } from '../../index.ts'
import { cleanClientTest, enableClientTest, openPage } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
  isOutdatedClient.set(true)
})

afterEach(async () => {
  await cleanClientTest()
})

test('shows update message', () => {
  let page = openPage({
    params: {},
    route: 'updateClient'
  })

  page.handleUpdateClient()

  equal(isOutdatedClient.get(), false)
})
