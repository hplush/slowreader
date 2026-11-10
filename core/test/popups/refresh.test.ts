import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  closeAllPopups,
  isRefreshing,
  refreshRequested,
  refreshStatus,
  stopRefreshing
} from '../../index.ts'
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

    openTestPopup('refresh', '1')
    equal(refreshStatus.get(), 'start')

    refreshStatus.set('refreshingError')
    equal(refreshStatus.get(), 'refreshing')

    refreshStatus.set('done')
    equal(refreshStatus.get(), 'done')

    closeAllPopups()
  })

  test('starts refresh requested by icon', () => {
    refreshRequested.set(true)
    openTestPopup('refresh', '1')
    equal(refreshRequested.get(), false)
    equal(isRefreshing.get(), true)
    stopRefreshing()

    refreshRequested.set(true)
    equal(isRefreshing.get(), true)
    stopRefreshing()
    closeAllPopups()
  })
})
