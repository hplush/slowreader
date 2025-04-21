import type { ReadableAtom, WritableAtom } from 'nanostores'

import type { Routes } from '../router.ts'

export interface BaseReader<Name extends ReaderName = ReaderName> {
  exit(): void
  loading: ReadableAtom<boolean>
  name: Name
}

interface Extra {
  exit: () => void
  loading: ReadableAtom<boolean>
}

export type PostFilter = { reading: 'fast' | 'slow' } & (
  | { categoryId: string }
  | { feedId: string }
)

type FeedParams = Routes['fast'] | Routes['slow']
type FeedStores = {
  [K in keyof FeedParams]-?: WritableAtom<FeedParams[K]>
}

export type ReaderName = 'feed' | 'list'

export interface ReaderCreator<
  Name extends ReaderName = ReaderName,
  Rest extends Extra = Extra
> {
  (filter: PostFilter, params: FeedStores): BaseReader<Name> & Rest
}

export function createReader<Name extends ReaderName, Rest extends Extra>(
  name: Name,
  builder: (filter: PostFilter, params: FeedStores) => Rest
): ReaderCreator<Name, Rest> {
  return (filter, params) => {
    let reader = builder(filter, params)
    return {
      ...reader,
      name
    }
  }
}
