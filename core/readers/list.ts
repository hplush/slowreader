import { atom } from 'nanostores'

import {
  createPagination,
  moveToPage,
  setPagination
} from '../lib/pagination.ts'
import { deletePost, type PostValue } from '../post.ts'
import { router } from '../router.ts'
import { createReader, loadPosts } from './common.ts'

let POSTS_PER_PAGE = 100

export const listReader = createReader('list', (filter, params) => {
  let exited = false
  let $loading = atom(true)
  let $list = atom<PostValue[]>([])
  let $pages = createPagination(1, 1)
  let $read = atom<Set<string>>(new Set())

  function read(...ids: string[]): void {
    $read.set(new Set([...$read.get(), ...ids]))
  }

  let unbindSince = (): void => {}
  let unbindRouter = (): void => {}
  async function start(): Promise<void> {
    let posts = await loadPosts(filter)
    if (exited) return

    setPagination($pages, posts.length, POSTS_PER_PAGE)
    unbindSince = params.since.subscribe(value => {
      if (!value) value = 0
      let fromIndex = value * POSTS_PER_PAGE
      let list = posts.slice(fromIndex, fromIndex + POSTS_PER_PAGE)
      $list.set(list)
      moveToPage($pages, value)
    })
    unbindRouter = router.subscribe(route => {
      for (let popup of route.popups) {
        if (popup.popup === 'post') {
          let postId = popup.param
          let post = posts.find(i => i.id === postId)
          if (post) {
            read(postId)
            deletePost(postId)
          }
        }
      }
    })
  }
  start().then(() => {
    $loading.set(false)
  })

  async function readPage(): Promise<void> {
    let list = $list.get()
    let promise = Promise.all(list.map(i => deletePost(i.id)))
    read(...list.map(i => i.id))
    if ($pages.get().hasNext) {
      params.since.set($pages.get().page + 1)
    }
    await promise
  }

  return {
    exit() {
      exited = true
      unbindSince()
      unbindRouter()
    },
    list: $list,
    loading: $loading,
    pages: $pages,
    read: $read,
    readPage
  }
})

export type ListReader = ReturnType<typeof listReader>
