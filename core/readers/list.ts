import { getUserPostUrls } from '../account.ts'
import { createReader, loadDynamicFor } from './common.ts'
import { numberPager, nextPager } from './pagers.ts'

export const listReader = createReader('list', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return
  let pager = (filter.reading === 'fast' ? nextPager : numberPager)(
    filter,
    params,
    50
  )
  return {
    ...pager,
    dynamic: loadDynamicFor(filter),
    userPostUrl: getUserPostUrls()
  }
})

export type ListReader = NonNullable<ReturnType<typeof listReader>>
