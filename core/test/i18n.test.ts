import './environment.js'

import { equal } from 'node:assert'
import { test } from 'node:test'

import { i18n, settingsMessages } from '../index.js'

test('has i18n', async () => {
  equal(typeof i18n, 'function')
  equal(typeof settingsMessages.get().theme, 'string')
})
