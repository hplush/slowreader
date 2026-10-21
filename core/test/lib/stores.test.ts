import { atom, cleanStores } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { subscribeUntil } from '../../index.ts'
import { storeFromColumn } from '../../lib/stores.ts'

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

  test('creates store from the row column', () => {
    let $row = atom<{ value: { follow: boolean } | undefined }>({
      value: undefined
    })
    let changes: boolean[] = []
    let $follow = storeFromColumn($row, 'follow', false, value => {
      changes.push(value)
      $row.set({ value: { follow: value } })
      return Promise.resolve()
    })
    let unbind = $follow.listen(() => {})
    equal($follow.get(), false)

    $row.set({ value: { follow: true } })
    equal($follow.get(), true)
    deepEqual(changes, [])

    $follow.set(false)
    deepEqual(changes, [false])
    equal($row.get().value?.follow, false)

    unbind()
    cleanStores($follow)
    $follow.set(true)
    deepEqual(changes, [false])
  })
})
