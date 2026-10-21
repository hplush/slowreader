// Helpers to work with Nano Stores and Logux to simplify code
// by moving complexity to helper.

import { loguxSubscribe, loguxUnsubscribe } from '@logux/actions'
import { type CrossTabClient, loadValue } from '@logux/client'
import type { SqlStore } from '@nanostores/sql'
import {
  atom,
  effect,
  onMount,
  type ReadableAtom,
  type WritableAtom
} from 'nanostores'

import { client } from '../client.ts'
import { hasCloud } from '../settings.ts'

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

/**
 * Return promise which wait until the store will have the next value.
 */
export function nextValue(store: ReadableAtom): Promise<void> {
  return new Promise<void>(resolve => {
    let unbind = store.listen(() => {
      unbind()
      resolve()
    })
  })
}

/**
 * SQL store after the first query result.
 */
export type LoadedSqlStore<Value> = ReadableAtom<{
  status: 'ready'
  value: Value
}>

/**
 * Wait for the first query result. The store keeps the value, so it could
 * be used as loaded store.
 */
export async function waitSql<Value>(
  store: SqlStore<Value>
): Promise<LoadedSqlStore<Value>> {
  await loadValue(store)
  return store as LoadedSqlStore<Value>
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

/**
 * Value of async store, like `SqlStoreValue` from Nano Stores SQL.
 */
export type Loadable<Value> =
  | { status: 'loading' }
  | { status: 'ready'; value: Value }

export interface ListChanges<Item> {
  set(items: Item[]): void
  update(change: (items: Item[]) => Item[]): void
}

/**
 * List from the server’s `users/:id/:name` channel, which follows
 * the current client. It stays loading for users without cloud.
 */
export function channelList<Item>(
  name: string,
  listen: (logux: CrossTabClient, list: ListChanges<Item>) => (() => void)[]
): ReadableAtom<Loadable<Item[]>> {
  let $list = atom<Loadable<Item[]>>({ status: 'loading' })
  let changes: ListChanges<Item> = {
    set(items) {
      $list.set({ status: 'ready', value: items })
    },
    update(change) {
      let list = $list.get()
      if (list.status === 'ready') {
        $list.set({ status: 'ready', value: change(list.value) })
      }
    }
  }
  onMount($list, () => {
    return effect([client, hasCloud], (logux, cloud) => {
      $list.set({ status: 'loading' })
      if (!logux || !cloud) return undefined
      let channel = `users/${logux.options.userId}/${name}`
      let unbinds = listen(logux, changes)
      void logux.sync(loguxSubscribe({ channel }))
      return () => {
        for (let unbind of unbinds) unbind()
        void logux.sync(loguxUnsubscribe({ channel }))
      }
    })
  })
  return $list
}

/**
 * Writable store of the row’s column for form controls like `Switch`.
 * It follows the row and saves user’s changes by `change`.
 */
export function storeFromColumn<Row extends object, Column extends keyof Row>(
  $row: ReadableAtom<{ value: Row | undefined }>,
  column: Column,
  fallback: Row[Column],
  change: (value: Row[Column]) => Promise<void>
): WritableAtom<Row[Column]> {
  let $value = atom(fallback)
  onMount($value, () => {
    let unbindRow = $row.subscribe(({ value: row }) => {
      if (row) $value.set(row[column])
    })
    let unbindValue = $value.listen(value => {
      let row = $row.get().value
      if (row && row[column] !== value) void change(value as Row[Column])
    })
    return () => {
      unbindRow()
      unbindValue()
    }
  })
  return $value
}
