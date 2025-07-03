import { equal } from 'node:assert'
import { beforeEach, test } from 'node:test'

import { getTestEnvironment, setupEnvironment } from '../../index.ts'
import { openPage } from '../utils.ts'

beforeEach(() => {
  setupEnvironment(getTestEnvironment())
})

test('opens start page', () => {
  let page = openPage({
    params: {},
    route: 'start'
  })

  equal(page.loading.get(), false)
})
