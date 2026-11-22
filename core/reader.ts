import { atom, computed } from 'nanostores'

import { changeCategory } from './category.ts'
import { changeFeed } from './feed.ts'
import { waitLoading } from './lib/stores.ts'
import type { BaseReader, UsefulReaderName } from './readers/common.ts'
import { navigate } from './router.ts'

export type ReaderTarget = { categoryId: string } | { feedId: string }

/**
 * Reader, which user has chosen, while the database is still saving it.
 */
export const pickedReader = atom<
  ({ reader: UsefulReaderName } & ReaderTarget) | undefined
>()

/**
 * Reader on the screen. Feeds page sets it.
 */
export const shownReader = atom<BaseReader | undefined>()

export function isOpenedInReader(
  target: ReaderTarget,
  params: { category?: string; feed?: string }
): boolean {
  return 'feedId' in target
    ? target.feedId === params.feed
    : !params.feed && target.categoryId === params.category
}

/**
 * Feeds page shows the new reader before the database saves it.
 */
export async function changeReader(
  target: ReaderTarget,
  reader: UsefulReaderName
): Promise<void> {
  navigate(route =>
    (route.route === 'fast' || route.route === 'slow') &&
    isOpenedInReader(target, route.params)
      ? { ...route, params: { ...route.params, from: undefined } }
      : route
  )
  // Firefox spends seconds on the database commit
  let picked = { ...target, reader }
  pickedReader.set(picked)
  // Queries of the new reader would wait for the write transaction
  let shown = shownReader.get()
  if (shown) {
    await waitLoading(
      computed(
        [shown.loading, shownReader],
        (loading, current) => loading && current === shown
      )
    )
  }
  try {
    if ('feedId' in target) {
      await changeFeed(target.feedId, { reader })
    } else {
      await changeCategory(target.categoryId, { reader })
    }
  } finally {
    if (pickedReader.get() === picked) pickedReader.set(undefined)
  }
}
