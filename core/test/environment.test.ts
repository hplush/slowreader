import { atom } from 'nanostores'
import { test } from 'uvu'
import { equal, throws } from 'uvu/assert'

import { getEnvironment, onEnvironment, setupEnvironment } from '../index.js'
import { getTestEnvironment } from './utils.js'

test('throws on current environment if it is not set', () => {
  throws(() => {
    getEnvironment()
  }, /^SlowReaderNoEnvironment$/)
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
  equal(calls, [])

  setupEnvironment({ ...getTestEnvironment(), locale: atom('fr') })
  equal(calls, ['fr'])
  equal(cleans, 0)

  setupEnvironment({ ...getTestEnvironment(), locale: atom('ru') })
  equal(calls, ['fr', 'ru'])
  equal(cleans, 1)

  let after: string[] = []
  onEnvironment(env => {
    after.push(env.locale.get())
  })
  equal(after, ['ru'])
  equal(cleans, 1)
})

test('returns current environment', () => {
  let locale = atom('fr')
  setupEnvironment({ ...getTestEnvironment(), locale })
  equal(getEnvironment().locale, locale)
})

test.run()
