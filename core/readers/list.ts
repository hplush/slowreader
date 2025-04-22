import { atom } from 'nanostores'

import { createPagination, moveToPage, setPagination } from '../pagination.ts'
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
            $read.set(new Set([postId, ...$read.get()]))
            deletePost(postId)
          }
        }
      }
    })
  }
  start().then(() => {
    $loading.set(false)
  })

  return {
    exit() {
      exited = true
      unbindSince()
      unbindRouter()
    },
    list: $list,
    loading: $loading,
    pages: $pages,
    read: $read
  }
})

export type ListReader = ReturnType<typeof listReader>
