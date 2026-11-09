import { equal, notEqual } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getStableId } from '../../lib/stable-id.ts'

describe('stable ID', () => {
  test('returns the same ID for the same key', () => {
    equal(
      getStableId('feed https://a.social/@a'),
      getStableId('feed https://a.social/@a')
    )
    notEqual(
      getStableId('feed https://a.social/@a'),
      getStableId('feed https://a.social/@b')
    )
    equal(/^[0-9a-z]+$/.test(getStableId('')), true)
  })
})
