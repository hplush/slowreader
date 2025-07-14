import { cleanStores } from 'nanostores'
import { afterEach, beforeEach, test } from 'node:test'

import { openedPopups } from '../../index.ts'
import { cleanClientTest, enableClientTest, openTestPopup } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(openedPopups)
})

test('opens popup', () => {
  openTestPopup('refresh', '1')
})
