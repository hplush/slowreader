import { equal, is } from 'uvu/assert'
import { test } from 'uvu'

import { findSource, sources } from '../index.js'

test('iterates through sources', () => {
  is(
    findSource(() => false),
    undefined
  )
  equal(
    findSource(i => i === sources.twitter),
    'twitter'
  )
})

test.run()
