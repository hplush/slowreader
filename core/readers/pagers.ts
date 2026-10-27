import { atom, type ReadableAtom, type WritableAtom } from 'nanostores'

import {
  createPagination,
  moveToPage,
  type PaginationValue,
  setPagination
} from '../lib/pagination.ts'
import type { ReaderPost } from '../post.ts'
import {
  type FeedStores,
  loadPageCursors,
  loadPostsAbove,
  loadPostsPage,
  loadPostsRange,
  parseCursor,
  type PostCursor,
  type PostFilter,
  readAndMove,
  stringifyCursor,
  topCursor,
  trackReadPosts
} from './common.ts'

type Pager<Pagination> = {
  exit(): void
  list: ReadableAtom<ReaderPost[]>
  loading: WritableAtom<boolean>
  pagination: Pagination
  readingPage: ReadableAtom<boolean>
  readPage(): Promise<void>
}

export type NextPager = Pager<{
  hasNext: ReadableAtom<boolean>
  nextFrom: ReadableAtom<string | undefined>
  page: ReadableAtom<number>
  prevFrom: ReadableAtom<string | undefined>
  type: 'next'
}>

export type NumberPager = Pager<{
  pages: ReadableAtom<PaginationValue>
  type: 'number'
}>

/**
 * Fast reading has no total and moves by cursor, since the user should not
 * see how much is left.
 */
export function nextPager(
  filter: PostFilter,
  params: FeedStores,
  size: number
): NextPager {
  let exited = false
  let $loading = atom(true)
  let $readingPage = atom(false)
  let $list = atom<ReaderPost[]>([])
  let $hasNext = atom(false)
  let $nextFrom = atom<string | undefined>()
  let $prevFrom = atom<string | undefined>()
  let $page = atom(0)

  let openAt = Date.now()
  let request = 0

  /**
   * `readPage()` reads the whole page, so unread posts above the next page
   * are the same as above the current one. The cursor of the previous page
   * is reused instead of a query, which would see the marks only after
   * the background write.
   */
  let keepPrevFrom = false

  async function loadPage(from: string | undefined): Promise<void> {
    let current = ++request
    let keep = keepPrevFrom
    keepPrevFrom = false
    let movedNext = keep || (!!from && from === $nextFrom.get())
    let movedPrev = !!from && from === $prevFrom.get()
    let cursor = parseCursor(from) ?? topCursor(openAt)
    let [posts, above] = await Promise.all([
      loadPostsPage(filter, cursor, size + 1),
      from && !keep ? loadPostsAbove(filter, cursor, size + 1) : undefined
    ])
    if (exited || current !== request) return

    let list = posts.slice(0, size)
    let last = list[list.length - 1]
    $hasNext.set(posts.length > size)
    $nextFrom.set(last && stringifyCursor(last))
    if (!keep) {
      if (!above || above.length === 0) {
        $prevFrom.set(undefined)
      } else {
        let prevFrom = stringifyCursor(above[size] ?? topCursor(openAt))
        $prevFrom.set(prevFrom === from ? undefined : prevFrom)
      }
    }
    if (!from) {
      $page.set(0)
    } else if (movedNext) {
      $page.set($page.get() + 1)
    } else if (movedPrev) {
      $page.set($page.get() - 1)
    } else {
      $page.set(Math.ceil((above?.length ?? 0) / size))
    }
    $list.set(list)
    $loading.set(false)
  }

  let unbindFrom = params.from.subscribe(value => {
    $loading.set(true)
    void loadPage(value)
  })
  let unbindRead = trackReadPosts(filter, $list)

  return {
    exit() {
      exited = true
      unbindFrom()
      unbindRead()
    },
    list: $list,
    loading: $loading,
    pagination: {
      hasNext: $hasNext,
      nextFrom: $nextFrom,
      page: $page,
      prevFrom: $prevFrom,
      type: 'next'
    },
    readingPage: $readingPage,
    readPage(): Promise<void> {
      let next = $hasNext.get() ? $nextFrom.get() : undefined
      keepPrevFrom = !!next
      return readAndMove(filter, params, $list.get(), next, $readingPage)
    }
  }
}

/**
 * Slow reading shows page numbers, so the user could plan the reading.
 */
export function numberPager(
  filter: PostFilter,
  params: FeedStores,
  size: number
): NumberPager {
  let exited = false
  let $loading = atom(true)
  let $readingPage = atom(false)
  let $list = atom<ReaderPost[]>([])
  let $pages = createPagination(1)

  let cursors: PostCursor[] = []
  let request = 0

  async function loadPage(page: number): Promise<void> {
    let current = ++request
    let cursor = cursors[page]
    let posts = cursor
      ? await loadPostsRange(filter, cursor, cursors[page + 1])
      : []
    if (exited || current !== request) return
    moveToPage($pages, page)
    $list.set(posts)
    $loading.set(false)
  }

  let unbindFrom = (): void => {}
  let unbindRead = trackReadPosts(filter, $list)
  async function start(): Promise<void> {
    cursors = await loadPageCursors(filter, size)
    if (exited) return
    setPagination($pages, cursors.length)
    unbindFrom = params.from.subscribe(value => {
      $loading.set(true)
      void loadPage(value ? parseInt(value) : 0)
    })
  }
  void start()

  return {
    exit() {
      exited = true
      unbindFrom()
      unbindRead()
    },
    list: $list,
    loading: $loading,
    pagination: {
      pages: $pages,
      type: 'number'
    },
    readingPage: $readingPage,
    readPage(): Promise<void> {
      return readAndMove(
        filter,
        params,
        $list.get(),
        $pages.get().hasNext ? `${$pages.get().page + 1}` : undefined,
        $readingPage
      )
    }
  }
}
