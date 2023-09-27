import { equal, match } from 'node:assert'
import { test } from 'node:test'

import { SlowReaderError } from '../index.js'

test('formats error', () => {
  let error = new SlowReaderError('Test')
  equal(error.name, 'SlowReaderError')
  equal(error.message, 'SlowReaderTest')
  match(error.stack!, /error\.test\.ts/)
})
