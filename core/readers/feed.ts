import { computed } from 'nanostores'

import { getUserPostUrls } from '../account.ts'
import { hasPersonAvatar } from '../loader/index.ts'
import { createReader, type FeedAuthor } from './common.ts'
import { numberPager, nextPager } from './pagers.ts'

export const feedReader = createReader('feed', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return
  let pager = (filter.reading === 'fast' ? nextPager : numberPager)(
    filter,
    params,
    20
  )
  return {
    ...pager,
    authors: computed(pager.list, list => {
      let authors = new Map<string, FeedAuthor>()
      if (!filter.categoryId) return authors
      for (let post of list) {
        if (!post.feedId) continue
        authors.set(post.feedId, {
          avatar: post.authorAvatar ?? null,
          feedId: post.feedId,
          round: hasPersonAvatar(post.authorLoader),
          title: post.authorTitle!,
          url: post.authorUrl!
        })
      }
      return authors
    }),
    userPostUrl: getUserPostUrls()
  }
})

export type FeedReader = NonNullable<ReturnType<typeof feedReader>>
