import { cleanStores } from 'nanostores'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import { closeAllPopups, openedPopups, refreshStatus } from '../../index.ts'
import { cleanClientTest, enableClientTest, openTestPopup } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(openedPopups)
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
