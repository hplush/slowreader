import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { comfortMode, errorMode } from '../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  setBaseTestRoute,
  setTestUser
} from './utils.ts'

describe('modes', () => {
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
    equal(errorMode.get(), false)

    setTestUser()

    setBaseTestRoute({ params: {}, route: 'slow' })
    equal(comfortMode.get(), true)
    equal(errorMode.get(), false)

    setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
    equal(comfortMode.get(), false)
    equal(errorMode.get(), false)

    setBaseTestRoute({ params: {}, route: 'notFound' })
    equal(comfortMode.get(), false)
    equal(errorMode.get(), true)

    setBaseTestRoute({ params: {}, route: 'cloud' })
    equal(comfortMode.get(), true)
    equal(errorMode.get(), false)
  })
})
