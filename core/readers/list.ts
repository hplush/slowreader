import { atom } from 'nanostores'

import {
  createPagination,
  moveToPage,
  setPagination
} from '../lib/pagination.ts'
import type { ReaderPost } from '../post.ts'
import {
  createReader,
  loadPageCursors,
  loadPostsRange,
  type PostCursor,
  readAndMove,
  trackReadPosts
} from './common.ts'

const POSTS_PER_PAGE = 50

export const listReader = createReader('list', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return

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
    cursors = await loadPageCursors(filter, POSTS_PER_PAGE)
    if (exited) return
    setPagination($pages, cursors.length)
    unbindFrom = params.from.subscribe(value => {
      $loading.set(true)
      void loadPage(value ? parseInt(value) : 0)
    })
  }
  void start()

  function readPage(): Promise<void> {
    return readAndMove(
      filter,
      params,
      $list.get(),
      $pages.get().hasNext ? `${$pages.get().page + 1}` : undefined,
      $readingPage
    )
  }

  return {
    exit() {
      exited = true
      unbindFrom()
      unbindRead()
    },
    list: $list,
    loading: $loading,
    readingPage: $readingPage,
    pages: $pages,
    readPage
  }
})

export type ListReader = NonNullable<ReturnType<typeof listReader>>
