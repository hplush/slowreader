// Helpers to work with Nano Stores and Logux to simplify code
// by moving complexity to helper.

import type { SqlStore } from '@nanostores/sql'
import {
  computed,
  type MapStore,
  type ReadableAtom,
  type StoreValue
} from 'nanostores'

export function firstRow<Value>(
  store: SqlStore<Value[]>
): ReadableAtom<undefined | Value> {
  return computed(store, rows => (rows.isLoading ? undefined : rows.value[0]))
}

type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

export function increaseKey<Store extends MapStore>(
  store: Store,
  key: NumberKeys<StoreValue<Store>>,
  by = 1
): void {
  // oxlint-disable-next-line typescript/no-unsafe-member-access
  let value = store.get()[key] as number
  store.setKey(key, value + by)
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
