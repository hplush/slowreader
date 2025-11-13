import { atom } from 'nanostores'

import { createReader } from './common.ts'

export const emptyReader = createReader('empty', ({ reading }) => {
  return {
    exit() {},
    loading: atom(false),
    reading
  }
})

export type EmptyReader = NonNullable<ReturnType<typeof emptyReader>>
