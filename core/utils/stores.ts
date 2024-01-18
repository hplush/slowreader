import type { MapStore, ReadableAtom, StoreValue } from 'nanostores'

export type OptionalId<Value> = Omit<Value, 'id'> & { id?: string }

export function readonlyExport<Store extends ReadableAtom>(
  store: Store
): ReadableAtom<StoreValue<Store>> {
  return store
}

type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

export function increaseKey<Store extends MapStore>(
  store: Store,
  key: NumberKeys<StoreValue<Store>>
): void {
  store.setKey(key, store.get()[key] + 1)
}
