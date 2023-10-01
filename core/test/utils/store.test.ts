import { map } from 'nanostores'
import { deepStrictEqual } from 'node:assert'
import { test } from 'node:test'

import { increaseKey } from '../../utils/stores.js'

test('increase keys', () => {
  let $map = map({ a: 0, b: 0 })

  increaseKey($map, 'a')
  deepStrictEqual($map.get(), { a: 1, b: 0 })
})
