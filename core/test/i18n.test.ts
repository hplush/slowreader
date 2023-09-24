import './environment.js'

import { test } from 'uvu'
import { type } from 'uvu/assert'

import { i18n } from '../index.js'
import { settingsMessages } from '../messages/index.js'

test('has i18n', async () => {
  type(i18n, 'function')
  type(settingsMessages.get().theme, 'string')
})

test.run()
