import { atom } from 'nanostores'
import { deepStrictEqual, equal, throws } from 'node:assert'
import { test } from 'node:test'

import {
  getEnvironment,
  getTestEnvironment,
  onEnvironment,
  setupEnvironment
} from '../index.js'

test('throws on current environment if it is not set', () => {
  throws(() => {
    getEnvironment()
  }, 'SlowReaderError: SlowReaderNoEnvironment')
})

test('runs callback when environment will be set', () => {
  let calls: string[] = []
  let cleans = 0
  onEnvironment(env => {
    calls.push(env.locale.get())
    return () => {
      cleans += 1
    }
  })
  deepStrictEqual(calls, [])

  setupEnvironment({ ...getTestEnvironment(), locale: atom('fr') })
  deepStrictEqual(calls, ['fr'])
  equal(cleans, 0)

  setupEnvironment({ ...getTestEnvironment(), locale: atom('ru') })
  deepStrictEqual(calls, ['fr', 'ru'])
  equal(cleans, 1)

  let after: string[] = []
  onEnvironment(env => {
    after.push(env.locale.get())
  })
  deepStrictEqual(after, ['ru'])
  equal(cleans, 1)
})

test('returns current environment', () => {
  let locale = atom('fr')
  setupEnvironment({ ...getTestEnvironment(), locale })
  equal(getEnvironment().locale, locale)
})
