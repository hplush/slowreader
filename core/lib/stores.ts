// Helpers to work with Nano Stores and Logux to simplify code
// by moving complexity to helper.

import type { SqlStore } from '@nanostores/sql'
import { computed, type ReadableAtom } from 'nanostores'

export function firstRow<Value>(
  store: SqlStore<Value[]>
): ReadableAtom<undefined | Value> {
  return computed(store, rows => (rows.isLoading ? undefined : rows.value[0]))
}

interface NumberMapStore<Key extends string> {
  get(): Record<Key, number>
  setKey(key: Key, value: number): void
}

export function increaseKey<Key extends string>(
  store: NumberMapStore<NoInfer<Key>>,
  key: Key,
  by = 1
): void {
  store.setKey(key, store.get()[key] + by)
}

/**
 * Return promise which wait until store stop to have `false`.
 *
 * It is useful in tests for stores like `page.loading`
 * to avoid flaky `setTimeout`.
 */
export function waitLoading(store: ReadableAtom): Promise<void> {
  return new Promise<void>(resolve => {
    /* node:coverage ignore next 4 */
    if (store.get() === false) {
      resolve()
      return
    }
    let unbind = store.subscribe(state => {
      if (state === false) {
        unbind()
        resolve()
      }
    })
  })
}

export async function waitSql<Row>(store: SqlStore<Row[]>): Promise<Row[]> {
  let unbind = store.listen(() => {})
  try {
    await store.loading
    let value = store.get()
    return value.isLoading ? [] : value.value
  } finally {
    unbind()
  }
}

/**
 * Subscribe to store and run callback on every store’s change until callback
 * return `true`.
 *
 * Abstraction to simplify complex code.
 */
export function subscribeUntil<Value>(
  store: ReadableAtom<Value>,
  cb: (value: Value) => boolean | undefined
): void {
  if (!cb(store.get())) {
    let unbind = store.listen(value => {
      if (cb(value)) {
        unbind()
      }
    })
  }
}
