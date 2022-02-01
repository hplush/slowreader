import { equal, is } from 'uvu/assert'
import { test } from 'uvu'

import { findSource } from './index.js'
import { twitter } from './twitter.js'

test('iterates through sources', () => {
  is(
    findSource(() => false),
    undefined
  )
  equal(
    findSource(i => i === twitter),
    'twitter'
  )
})

test.run()
