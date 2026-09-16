import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { fatal, GENERAL_CATEGORY, themeMode } from '../index.ts'
import { cleanClient, startClient, openRoute, setTestUser } from './utils.ts'

describe('modes', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('has routes groups', () => {
    setTestUser(false)
    openRoute({ params: {}, route: 'home' })
    equal(themeMode.get(), 'comfort')

    setTestUser()

    openRoute({ params: {}, route: 'slow' })
    equal(themeMode.get(), 'comfort')

    openRoute({ params: { category: GENERAL_CATEGORY }, route: 'fast' })
    equal(themeMode.get(), 'fast')

    openRoute({ params: {}, route: 'fatal' })
    equal(themeMode.get(), 'error')

    openRoute({ params: {}, route: 'cloud' })
    equal(themeMode.get(), 'comfort')

    // The error can break the app on any page
    fatal.set({ type: 'outdated' })
    equal(themeMode.get(), 'error')
    fatal.set(undefined)
  })
})
