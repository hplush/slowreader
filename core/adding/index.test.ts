import { equal } from 'uvu/assert'
import { test } from 'uvu'

import { getSourceFromUrl } from './index.js'

test('iterates through sources', () => {
  equal(getSourceFromUrl('twitter.com/user'), 'twitter')
  equal(getSourceFromUrl('example.com'), 'unknown')
  equal(getSourceFromUrl(''), 'unknown')
})

test.run()
