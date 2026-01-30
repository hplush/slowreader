import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { currentPage } from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  openPage,
  setBaseTestRoute
} from '../utils.ts'

beforeEach(() => {
  enableClientTest()
  setBaseTestRoute({ params: {}, route: 'updateClient' })
})

afterEach(async () => {
  await cleanClientTest()
})

test('shows update client page', () => {
  let page = openPage({
    params: {},
    route: 'updateClient'
  })

  equal(currentPage.get().route, page.route)
})
