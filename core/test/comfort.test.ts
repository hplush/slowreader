import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { comfortMode } from '../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  setBaseTestRoute,
  setTestUser
} from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('has routes groups', () => {
  setTestUser(false)
  setBaseTestRoute({ params: {}, route: 'home' })
  equal(comfortMode.get(), true)

  setTestUser()

  setBaseTestRoute({ params: {}, route: 'slow' })
  equal(comfortMode.get(), true)

  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  equal(comfortMode.get(), false)

  setBaseTestRoute({ params: {}, route: 'profile' })
  equal(comfortMode.get(), true)
})
