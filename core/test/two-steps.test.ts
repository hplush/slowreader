import { strictEqual } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import { secondStep, setBaseTestRoute } from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('show first side', () => {
  setBaseTestRoute({ params: {}, route: 'add' })
  strictEqual(secondStep.get(), false)

  setBaseTestRoute({ params: {}, route: 'categories' })
  strictEqual(secondStep.get(), false)

  setBaseTestRoute({ params: {}, route: 'fast' })
  strictEqual(secondStep.get(), false)

  setBaseTestRoute({ params: {}, route: 'slow' })
  strictEqual(secondStep.get(), false)
})
