import { atom, computed } from 'nanostores'

import { fastPostsCount, slowPostsCount } from '../post.ts'
import { createReader } from './common.ts'

export const emptyReader = createReader(
  'empty',
  ({ categoryId, feedId, reading }) => {
    return {
      allRead:
        categoryId || feedId
          ? atom(true)
          : computed(
              reading === 'fast' ? fastPostsCount : slowPostsCount,
              count => count === 0
            ),
      category:
        reading === 'fast' && !!categoryId && fastPostsCount.get() !== 0,
      exit() {},
      loading: atom(false),
      reading
    }
  }
)

export type EmptyReader = NonNullable<ReturnType<typeof emptyReader>>
