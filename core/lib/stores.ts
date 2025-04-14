import type { SyncMapValues } from '@logux/actions'
import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
import type {
  MapStore,
  ReadableAtom,
  StoreValue,
  WritableAtom
} from 'nanostores'

export type OptionalId<Value> = { id?: string } & Omit<Value, 'id'>

type StoreValues<Stores extends ReadableAtom[]> = {
  [Index in keyof Stores]: StoreValue<Stores[Index]>
}

export function readonlyExport<Value>(
  store: ReadableAtom<Value>
): ReadableAtom<Value> {
  return store
}

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

export function listenMany<SourceStores extends ReadableAtom[]>(
  stores: [...SourceStores],
  cb: (...values: StoreValues<SourceStores>) => void
): () => void {
  function listener(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    let values = stores.map(store => store.get()) as StoreValues<SourceStores>
    cb(...values)
  }
  let unbinds = stores.map(store => store.listen(listener))
  listener()
  return () => {
    for (let unbind of unbinds) unbind()
  }
}

export function computeFrom<Value, SourceStores extends ReadableAtom[]>(
  to: WritableAtom<Value>,
  stores: [...SourceStores],
  compute: (...values: StoreValues<SourceStores>) => Value,
  compare?: (a: Value, b: Value) => boolean
): () => void {
  return listenMany(stores, (...values) => {
    let newValue = compute(...values)
    if (!compare?.(newValue, to.get())) {
      to.set(newValue)
    }
  })
}

export function waitLoading(store: ReadableAtom): Promise<void> {
  return new Promise<void>(resolve => {
    let unbind = store.listen(state => {
      if (state === false) {
        unbind()
        resolve()
      }
    })
  })
}

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
