import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
import { atom } from 'nanostores'

import {
  createPagination,
  moveToPage,
  setPagination
} from '../lib/pagination.ts'
import { changePost, type PostValue } from '../post.ts'
import { createReader, loadPosts } from './common.ts'

let POSTS_PER_PAGE = 100

export const listReader = createReader('list', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<LoadedSyncMap<SyncMapStore<PostValue>>[]>([])
  let $pages = createPagination(1, 1)

  let unbindFrom = (): void => {}
  async function start(): Promise<void> {
    let posts = await loadPosts(filter)
    if (exited) return

    function updateList(): void {
      let from = params.from.get()
      if (!from) from = 0
      let fromIndex = from * POSTS_PER_PAGE
      let list = posts.slice(fromIndex, fromIndex + POSTS_PER_PAGE)
      $list.set(list)
      moveToPage($pages, from)
    }

    setPagination($pages, posts.length, POSTS_PER_PAGE)
    unbindFrom = params.from.subscribe(updateList)
  }
  start().then(() => {
    $loading.set(false)
  })

  async function readPage(): Promise<void> {
    let list = $list.get()
    let promise = Promise.all(
      list.map(i => changePost(i.get().id, { read: true }))
    )
    if ($pages.get().hasNext) {
      params.from.set($pages.get().page + 1)
    }
    await promise
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
