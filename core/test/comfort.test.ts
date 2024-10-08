import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { comfortMode, setBaseTestRoute, userId } from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('has routes groups', () => {
  userId.set(undefined)
  setBaseTestRoute({ params: {}, route: 'home' })
  equal(comfortMode.get(), true)

  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'refresh' })
  equal(comfortMode.get(), true)

  setBaseTestRoute({ params: {}, route: 'slow' })
  equal(comfortMode.get(), true)

  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  equal(comfortMode.get(), false)

  setBaseTestRoute({ params: {}, route: 'profile' })
  equal(comfortMode.get(), true)
})
