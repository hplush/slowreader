import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { closeAllPopups, openRefresh, refreshStatus } from '../../index.ts'
import { cleanClient, startClient, openTestPopup } from '../utils.ts'

describe('refresh popup', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('cleans error from refresh icon', () => {
    refreshStatus.set('error')
    equal(refreshStatus.get(), 'error')
    equal(openRefresh.get(), true)

    openTestPopup('refresh', '1')
    equal(refreshStatus.get(), 'no')
    equal(openRefresh.get(), false)

    refreshStatus.set('refreshingError')
    equal(refreshStatus.get(), 'refreshing')
    equal(openRefresh.get(), true)

    refreshStatus.set('done')
    equal(refreshStatus.get(), 'done')
    equal(openRefresh.get(), false)

    closeAllPopups()
  })
})
