import { atom } from 'nanostores'
import { deepStrictEqual, equal, throws } from 'node:assert'
import { test } from 'node:test'

import {
  getEnvironment,
  getTestEnvironment,
  onEnvironment,
  setupEnvironment
} from '../index.ts'

test('throws on current environment if it is not set', () => {
  throws(() => {
    getEnvironment()
  }, 'Error: No Slow Reader environment')
})

test('runs callback when environment will be set', () => {
  let calls: string[] = []
  let cleans = ''
  onEnvironment(env => {
    calls.push(env.locale.get())
    return () => {
      cleans += '1'
    }
  })
  onEnvironment(() => {
    return [
      () => {
        cleans += '2'
      },
      () => {
        cleans += '3'
      }
    ]
  })
  deepStrictEqual(calls, [])

  setupEnvironment({ ...getTestEnvironment(), locale: atom('fr') })
  deepStrictEqual(calls, ['fr'])
  equal(cleans, '')

  setupEnvironment({ ...getTestEnvironment(), locale: atom('ru') })
  deepStrictEqual(calls, ['fr', 'ru'])
  equal(cleans, '123')

  let after: string[] = []
  onEnvironment(env => {
    after.push(env.locale.get())
  })
  deepStrictEqual(after, ['ru'])
  equal(cleans, '123')
})

test('returns current environment', () => {
  let locale = atom('fr')
  setupEnvironment({ ...getTestEnvironment(), locale })
  equal(getEnvironment().locale, locale)
})
