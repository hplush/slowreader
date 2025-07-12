// Helpers to work with Nano Stores and Logux to simplify code
// by moving complexity to helper.

import type { SyncMapValues } from '@logux/actions'
import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
import type { Action } from '@logux/core'
import {
  type MapStore,
  onMount,
  type ReadableAtom,
  type StoreValue
} from 'nanostores'

import { client } from '../client.ts'

export type OptionalId<Value> = { id?: string } & Omit<Value, 'id'>

type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

export function increaseKey<Store extends MapStore>(
  store: Store,
  key: NumberKeys<StoreValue<Store>>
): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  let value = store.get()[key] as number
  store.setKey(key, value + 1)
}

/**
 * Return promise which wait until store stop to have `false`.
 *
 * It is useful in tests for stores like `page.loading`
 * to avoid flaky `setTimeout`.
 */
export function waitLoading(store: ReadableAtom): Promise<void> {
  return new Promise<void>(resolve => {
    let unbind = store.subscribe(state => {
      if (state === false) {
        unbind()
        resolve()
      }
    })
  })
}

/**
 * Return promise which wait until `store.isLoading` is stop to have `true`.
 */
export async function waitSyncLoading<Value extends SyncMapValues>(
  store: SyncMapStore<Value>
): Promise<LoadedSyncMap<SyncMapStore<Value>>> {
  let value = store.get()
  if (value.isLoading) {
    let unbind = store.listen(() => {})
    try {
      await store.loading
    } finally {
      unbind()
    }
  }
  return store as LoadedSyncMap<SyncMapStore<Value>>
}

/**
 * Run callback when store got first listener.
 *
 * It is like `onMount` in Nano Stores but work with multiple stores.
 * Callback runs on first listener for any of store.
 */
export function onMountAny(stores: ReadableAtom[], cb: () => () => void): void {
  let listeners = 0
  let unbind = (): void => {}
  function watching(): () => void {
    listeners++
    if (listeners === 1) {
      unbind = cb()
    }
    return () => {
      listeners--
      if (listeners === 0) {
        unbind()
      }
    }
  }
  for (let store of stores) {
    onMount(store, () => watching())
  }
}

/**
 * Run callback on every Logux action.
 *
 * It hides complexity of client re-creating on sign-in to re-subscribing.
 */
export function onLogAction(cb: (action: Action) => void): () => void {
  let unbindLog: (() => void) | undefined
  let unbindClient = client.subscribe(loguxClient => {
    unbindLog?.()
    unbindLog = undefined
    if (loguxClient) {
      unbindLog = loguxClient.log.on('add', cb)
    }
  })

  return () => {
    unbindLog?.()
    unbindClient()
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
