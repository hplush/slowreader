import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { removeProtocol } from './index.js'

test('removes protocol', () => {
  equal(removeProtocol('http://example.com'), 'example.com')
  equal(removeProtocol('https://example.com'), 'example.com')
  equal(removeProtocol('example.com'), 'example.com')
})

test.run()
