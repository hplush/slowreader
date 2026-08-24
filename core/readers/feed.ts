import { atom } from 'nanostores'

import { changePost, type ReaderPost } from '../post.ts'
import {
  createReader,
  loadPostsAbove,
  loadPostsPage,
  parseCursor,
  type PostAuthor,
  stringifyCursor,
  topCursor,
  trackReadPosts
} from './common.ts'

const POSTS_PER_PAGE = 40

export const feedReader = createReader('feed', (filter, params, helpers) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<ReaderPost[]>([])
  let $authors = atom<Map<string, PostAuthor>>(new Map())
  let $hasNext = atom(false)
  let $nextFrom = atom<string | undefined>()
  let $prevFrom = atom<string | undefined>()

  let openAt = Date.now()
  let request = 0

  /**
   * `readAndNext()` reads the whole page, so unread posts above the next page
   * are the same as above the current one. The cursor of the previous page
   * is reused instead of a query, which would see the marks only after
   * the background write.
   */
  let keepPrevFrom = false

  async function loadPage(from: string | undefined): Promise<void> {
    let current = ++request
    let keep = keepPrevFrom
    keepPrevFrom = false
    let cursor = parseCursor(from) ?? topCursor(openAt)
    let [posts, above] = await Promise.all([
      loadPostsPage(filter, cursor, POSTS_PER_PAGE + 1),
      from && !keep
        ? loadPostsAbove(filter, cursor, POSTS_PER_PAGE + 1)
        : undefined
    ])
    if (exited || current !== request) return

    let list = posts.slice(0, POSTS_PER_PAGE)
    let last = list[list.length - 1]
    $hasNext.set(posts.length > POSTS_PER_PAGE)
    $nextFrom.set(last && stringifyCursor(last))
    if (!keep) {
      if (!above || above.length === 0) {
        $prevFrom.set(undefined)
      } else {
        let prevFrom = stringifyCursor(
          above[POSTS_PER_PAGE] ?? topCursor(openAt)
        )
        $prevFrom.set(prevFrom === from ? undefined : prevFrom)
      }
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
  let unbindRead = trackReadPosts(filter, $list)

  // The move does not wait for the write: the marks are saved in background.
  // The page of the next cursor does not depend on them, since the cursor
  // is strict `<`, and the move goes first to put the query of the page
  // into the database queue before the write.
  function readAndNext(): Promise<void> {
    let unread = $list
      .get()
      .filter(post => !post.read)
      .map(post => post.id)
    if ($hasNext.get()) {
      keepPrevFrom = true
      params.from.set($nextFrom.get())
    } else {
      helpers.renderEmpty()
    }
    return changePost(unread, { read: 1 })
  }

  return {
    authors: $authors,
    exit() {
      exited = true
      unbindFrom()
      unbindRead()
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
