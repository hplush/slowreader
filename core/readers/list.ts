import { atom } from 'nanostores'

import {
  createPagination,
  moveToPage,
  setPagination
} from '../lib/pagination.ts'
import { changePost, type ReaderPost } from '../post.ts'
import {
  createReader,
  loadPageCursors,
  loadPostsPage,
  type PostCursor
} from './common.ts'

const POSTS_PER_PAGE = 100

export const listReader = createReader('list', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<ReaderPost[]>([])
  let $pages = createPagination(1)

  let cursors: PostCursor[] = []
  let request = 0

  async function loadPage(page: number): Promise<void> {
    let current = ++request
    let cursor = cursors[page]
    let posts = cursor
      ? await loadPostsPage(filter, cursor, POSTS_PER_PAGE)
      : []
    if (exited || current !== request) return
    moveToPage($pages, page)
    $list.set(posts)
    $loading.set(false)
  }

  let unbindFrom = (): void => {}
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

  async function readPage(): Promise<void> {
    await changePost(
      $list
        .get()
        .filter(post => !post.read)
        .map(post => post.id),
      { read: 1 }
    )
    if (exited) return
    if ($pages.get().hasNext) {
      params.from.set(`${$pages.get().page + 1}`)
    }
  }

  return {
    exit() {
      exited = true
      unbindFrom()
    },
    list: $list,
    loading: $loading,
    pages: $pages,
    readPage
  }
})

export type ListReader = NonNullable<ReturnType<typeof listReader>>
