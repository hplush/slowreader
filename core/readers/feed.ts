import { atom } from 'nanostores'

import { changePost } from '../post.ts'
import {
  createReader,
  loadPostsAbove,
  loadPostsPage,
  type PostAuthor,
  type ReaderPost
} from './common.ts'

const POSTS_PER_PAGE = 40

export const feedReader = createReader('feed', (filter, params, helpers) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<ReaderPost[]>([])
  let $authors = atom<Map<string, PostAuthor>>(new Map())
  let $hasNext = atom(false)
  let $nextFrom = atom<number | undefined>()
  let $prevFrom = atom<number | undefined>()

  let openAt = Date.now()
  let request = 0

  async function loadPage(from: number | undefined): Promise<void> {
    let current = ++request
    let [posts, above] = await Promise.all([
      loadPostsPage(filter, from ?? openAt, POSTS_PER_PAGE + 1),
      from ? loadPostsAbove(filter, from, POSTS_PER_PAGE + 1) : undefined
    ])
    if (exited || current !== request) return

    let list = posts.slice(0, POSTS_PER_PAGE)
    $hasNext.set(posts.length > POSTS_PER_PAGE)
    $nextFrom.set(list[list.length - 1]?.publishedAt)
    if (!above || above.length === 0) {
      $prevFrom.set(undefined)
    } else {
      let prevFrom = above[POSTS_PER_PAGE] ?? openAt
      $prevFrom.set(prevFrom === from ? undefined : prevFrom)
    }
    if (filter.categoryId) {
      $authors.set(
        new Map(
          list.map(post => [
            post.feedId,
            { title: post.authorTitle!, url: post.authorUrl! }
          ])
        )
      )
    }
    $list.set(list)
    $loading.set(false)
  }

  let unbindFrom = params.from.subscribe(value => {
    $loading.set(true)
    void loadPage(value)
  })

  // The write is awaited before the move, so the next page and the cursor
  // of the previous page are taken from the database with the marks applied.
  async function readAndNext(): Promise<void> {
    await changePost(
      $list
        .get()
        .filter(post => !post.read)
        .map(post => post.id),
      { read: 1 }
    )
    if (exited) return
    if ($hasNext.get()) {
      params.from.set($nextFrom.get())
    } else {
      helpers.renderEmpty()
    }
  }

  return {
    authors: $authors,
    exit() {
      exited = true
      unbindFrom()
    },
    hasNext: $hasNext,
    list: $list,
    loading: $loading,
    nextFrom: $nextFrom,
    prevFrom: $prevFrom,
    readAndNext
  }
})

export type FeedReader = NonNullable<ReturnType<typeof feedReader>>
