import { test } from 'uvu'
import { equal, match } from 'uvu/assert'

import { SlowReaderError } from './index.js'

test('formats error', () => {
  let error = new SlowReaderError('Test')
  equal(error.name, 'SlowReaderError')
  equal(error.message, 'SlowReaderTest')
  match(error.stack!, 'error.test.ts')
})

test.run()
