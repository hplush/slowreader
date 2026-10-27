import { createReader } from './common.ts'
import { numberPager, nextPager } from './pagers.ts'

export const listReader = createReader('list', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return
  return (filter.reading === 'fast' ? nextPager : numberPager)(
    filter,
    params,
    50
  )
})

export type ListReader = NonNullable<ReturnType<typeof listReader>>
