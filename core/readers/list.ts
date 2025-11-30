import { atom } from 'nanostores'

import {
  createPagination,
  moveToPage,
  setPagination
} from '../lib/pagination.ts'
import { onLogAction } from '../lib/stores.ts'
import {
  changePost,
  deletePost,
  postsChangedAction,
  type PostValue
} from '../post.ts'
import { createReader, loadPosts } from './common.ts'

let POSTS_PER_PAGE = 100

export const listReader = createReader('list', (filter, params) => {
  if (!filter.categoryId && !filter.feedId) return

  async function deleteRead(): Promise<void> {
    let posts = await loadPosts(filter)
    await Promise.all(
      posts.map(async post => {
        if (post.read) await deletePost(post.id)
      })
    )
  }

  let exited = false
  let $loading = atom(true)
  let $list = atom<PostValue[]>([])
  let $pages = createPagination(1, 1)

  let unbindFrom = (): void => {}
  let unbindAction = (): void => {}
  async function start(): Promise<void> {
    await deleteRead()
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

    unbindAction = onLogAction(action => {
      if (postsChangedAction.match(action) && 'read' in action.fields) {
        for (let post of posts) {
          if (post.id === action.id) {
            post.read = action.fields.read
            break
          }
        }
        updateList()
      }
    })

    setPagination($pages, posts.length, POSTS_PER_PAGE)
    unbindFrom = params.from.subscribe(updateList)
  }
  start().then(() => {
    $loading.set(false)
  })

  async function readPage(): Promise<void> {
    let list = $list.get()
    let promise = Promise.all(list.map(i => changePost(i.id, { read: true })))
    if ($pages.get().hasNext) {
      params.from.set($pages.get().page + 1)
    }
    await promise
  }

  return {
    exit() {
      exited = true
      unbindAction()
      unbindFrom()
      deleteRead()
    },
    list: $list,
    loading: $loading,
    pages: $pages,
    readPage
  }
})

export type ListReader = NonNullable<ReturnType<typeof listReader>>
