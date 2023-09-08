import { test } from 'uvu'
import { type } from 'uvu/assert'

import { i18n } from '../index.js'

test('has i18n', async () => {
  type(i18n, 'function')
})

test.run()
