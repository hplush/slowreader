import { loadValue } from '@logux/client'

import { getFeeds } from '../feed.ts'
import { getPosts, type PostValue } from '../post.ts'
import type { PostFilter } from './common.ts'

export async function loadPosts(filter: PostFilter): Promise<PostValue[]> {
  let posts: PostValue[]
  if ('categoryId' in filter) {
    let [allPosts, feeds] = await Promise.all([
      loadValue(getPosts({ reading: filter.reading })),
      loadValue(getFeeds({ categoryId: filter.categoryId }))
    ])
    posts = allPosts.list.filter(i => feeds.stores.has(i.feedId))
  } else {
    posts = (
      await loadValue(
        getPosts({ feedId: filter.feedId, reading: filter.reading })
      )
    ).list
  }
  return posts.sort((a, b) => b.publishedAt - a.publishedAt)
}
