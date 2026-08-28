import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { fatal, GENERAL_CATEGORY, themeMode } from '../index.ts'
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
    equal(themeMode.get(), 'comfort')

    setTestUser()

    setBaseTestRoute({ params: {}, route: 'slow' })
    equal(themeMode.get(), 'comfort')

    setBaseTestRoute({ params: { category: GENERAL_CATEGORY }, route: 'fast' })
    equal(themeMode.get(), 'fast')

    setBaseTestRoute({ params: {}, route: 'fatal' })
    equal(themeMode.get(), 'error')

    setBaseTestRoute({ params: {}, route: 'cloud' })
    equal(themeMode.get(), 'comfort')

    // The error can break the app on any page
    fatal.set({ type: 'outdated' })
    equal(themeMode.get(), 'error')
    fatal.set(undefined)
  })
})
