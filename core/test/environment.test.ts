import { atom } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import { onEnvironment, setupEnvironment } from '../index.js'
import { getTestEnvironment } from './utils.js'

test.after.each(() => {
  setupEnvironment(getTestEnvironment())
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

test.run()
