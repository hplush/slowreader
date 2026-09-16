import { atom } from 'nanostores'

import { fastPostsCount } from '../post.ts'
import { createReader } from './common.ts'

export const emptyReader = createReader('empty', ({ categoryId, reading }) => {
  return {
    /**
     * Only the opened category was read, while other categories have
     * fast posts to read.
     */
    category: reading === 'fast' && !!categoryId && fastPostsCount.get() !== 0,
    exit() {},
    loading: atom(false),
    reading
  }
})

export type EmptyReader = NonNullable<ReturnType<typeof emptyReader>>
