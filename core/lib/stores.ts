import type {
  MapStore,
  ReadableAtom,
  StoreValue,
  WritableAtom
} from 'nanostores'

export type OptionalId<Value> = Omit<Value, 'id'> & { id?: string }

type StoreValues<Stores extends ReadableAtom[]> = {
  [Index in keyof Stores]: StoreValue<Stores[Index]>
}

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

export function listenMany<SourceStores extends ReadableAtom[]>(
  stores: [...SourceStores],
  cb: (...values: StoreValues<SourceStores>) => void
): () => void {
  function listener(): void {
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
