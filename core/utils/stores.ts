import type { ReadableAtom, StoreValue } from 'nanostores'

export function readonlyExport<Store extends ReadableAtom>(
  store: Store
): ReadableAtom<StoreValue<Store>> {
  return store
}
