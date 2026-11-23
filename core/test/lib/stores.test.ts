import { atom, cleanStores } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { type Loadable, subscribeUntil, switchOf, viewOf } from '../../index.ts'
import { storeFromColumn, storeFromQuery } from '../../lib/stores.ts'

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

  test('creates store from the query result', () => {
    let $query = atom<Loadable<number | undefined>>({ status: 'loading' })
    let $double = storeFromQuery($query, 0, value => value && value * 2)
    let unbind = $double.listen(() => {})
    equal($double.get(), 0)

    $query.set({ status: 'ready', value: 1 })
    equal($double.get(), 2)

    $query.set({ status: 'loading' })
    equal($double.get(), 2)
    $query.set({ status: 'ready', value: undefined })
    equal($double.get(), 2)
    $query.set({ status: 'ready', value: 4 })
    equal($double.get(), 8)

    equal($query.lc, 1)
    unbind()
    cleanStores($double)
    equal($query.lc, 0)
  })

  test('shows source as value and gives changes to callback', t => {
    let source = atom({ count: 1 })
    let writes: number[] = []
    let view = viewOf(
      source,
      value => value.count * 2,
      value => {
        writes.push(value)
      }
    )
    let unbind = view.listen(() => {})
    t.after(() => {
      unbind()
      cleanStores(view)
    })
    equal(view.get(), 2)

    view.set(10)
    deepEqual(writes, [10])
    equal(view.get(), 2)

    source.set({ count: 3 })
    equal(view.get(), 6)
  })

  test('shows two setting values as boolean', t => {
    let setting = atom<'always' | 'free' | 'never'>('free')
    let toggle = switchOf(setting, 'always', 'never')
    let changes: boolean[] = []
    let unbind = toggle.subscribe(value => {
      changes.push(value)
    })
    t.after(() => {
      unbind()
      cleanStores(toggle)
    })

    toggle.set(false)
    equal(setting.get(), 'free')

    toggle.set(true)
    equal(setting.get(), 'always')

    setting.set('never')
    deepEqual(changes, [false, true, false])
  })
})
