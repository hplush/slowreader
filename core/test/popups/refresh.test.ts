import { cleanStores } from 'nanostores'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import { openedPopups, refreshIcon } from '../../index.ts'
import { cleanClientTest, enableClientTest, openTestPopup } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(openedPopups)
})

test('cleans error from refresh icon', () => {
  refreshIcon.set('error')
  openTestPopup('refresh', '1')
  equal(refreshIcon.get(), 'start')

  refreshIcon.set('refreshingError')
  openTestPopup('refresh', '1')
  equal(refreshIcon.get(), 'refreshing')
})
