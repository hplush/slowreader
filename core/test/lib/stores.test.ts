import { atom } from 'nanostores'
import { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { subscribeUntil } from '../../index.ts'

describe('stores', () => {
  test('runs until first true', () => {
    let store = atom(0)

    let one = ''
    subscribeUntil(store, value => {
      one += value
      return true
    })

    let two = ''
    subscribeUntil(store, value => {
      two += value
      if (value === 2) return true
    })

    store.set(1)
    store.set(2)
    store.set(3)
    store.set(4)

    equal(one, '0')
    equal(two, '012')
  })
})
