import { atom } from 'nanostores'

import { deletePost, type PostValue } from '../post.ts'
import { createReader, loadPosts } from './common.ts'

const POSTS_PER_PAGE = 50

export const feedReader = createReader('feed', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<PostValue[]>([])
  let $hasNext = atom(false)

  let openAt = Date.now()
  let nextSince: number | undefined
  let unbindSince = (): void => {}
  async function start(): Promise<void> {
    let posts = await loadPosts(filter)
    if (exited) return

    unbindSince = params.since.subscribe(value => {
      if (!value) value = openAt
      let fromIndex = posts.findIndex(i => i.publishedAt < value)
      if (fromIndex === -1) fromIndex = posts.length
      let list = posts.slice(fromIndex, fromIndex + POSTS_PER_PAGE)
      $hasNext.set(posts.length > fromIndex + POSTS_PER_PAGE)
      while (
        list.length > 1 &&
        posts[fromIndex + list.length]?.publishedAt ===
          posts[fromIndex + list.length - 1]?.publishedAt
      ) {
        list = list.slice(0, -1)
      }
      nextSince = list[list.length - 1]?.publishedAt
      $list.set(list)
    })
  }
  start().then(() => {
    $loading.set(false)
  })

  async function deleteAndNext(): Promise<void> {
    let promise = Promise.all($list.get().map(i => deletePost(i.id)))
    params.since.set(nextSince)
    return promise.then()
  }

  return {
    deleteAndNext,
    exit() {
      exited = true
      unbindSince()
    },
    hasNext: $hasNext,
    list: $list,
    loading: $loading
  }
})

export type FeedReader = NonNullable<ReturnType<typeof feedReader>>
