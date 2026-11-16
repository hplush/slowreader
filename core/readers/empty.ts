import { atom, computed } from 'nanostores'

import { menuLoading, slowMenu, unreadFastMenu } from '../menu.ts'
import { createReader } from './common.ts'

export const emptyReader = createReader(
  'empty',
  ({ categoryId, feedId, reading }) => {
    return {
      allRead:
        categoryId || feedId
          ? atom(true)
          : computed(
              [menuLoading, reading === 'fast' ? unreadFastMenu : slowMenu],
              (loading, menu) => !loading && menu.length === 0
            ),
      category:
        reading === 'fast' && !!categoryId && unreadFastMenu.get().length > 0,
      exit() {},
      loading: atom(false),
      reading
    }
  }
)

export type EmptyReader = NonNullable<ReturnType<typeof emptyReader>>
