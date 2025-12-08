import { atom } from 'nanostores'

import { onLogAction } from '../lib/stores.ts'
import { changePost, postsChangedAction, type PostValue } from '../post.ts'
import { createReader, loadPosts } from './common.ts'

const POSTS_PER_PAGE = 50

export const feedReader = createReader('feed', (filter, params, helpers) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<PostValue[]>([])
  let $hasNext = atom(false)
  let $nextFrom = atom<number | undefined>()
  let $prevFrom = atom<number | undefined>()

  let openAt = Date.now()
  let unbindFrom = (): void => {}
  let unbindAction = (): void => {}
  async function start(): Promise<void> {
    let posts = await loadPosts(filter)
    if (exited) return

    unbindAction = onLogAction(action => {
      if (postsChangedAction.match(action) && 'read' in action.fields) {
        for (let post of posts) {
          if (post.id === action.id) {
            post.read = action.fields.read
            break
          }
        }
      }
    })

    unbindFrom = params.from.subscribe(value => {
      let from = value ?? openAt
      let fromIndex = posts.findIndex(i => i.publishedAt < from)
      if (fromIndex === -1) fromIndex = posts.length
      let list = posts.slice(fromIndex, fromIndex + POSTS_PER_PAGE)
      $hasNext.set(posts.length > fromIndex + POSTS_PER_PAGE)
      if (value) {
        let prevIndex = fromIndex - POSTS_PER_PAGE - 1
        let prevForm = posts[prevIndex]?.publishedAt ?? openAt
        $prevFrom.set(prevForm === value ? undefined : prevForm)
      } else {
        $prevFrom.set(undefined)
      }
      $nextFrom.set(list[list.length - 1]?.publishedAt)
      $list.set(list)
    })
  }
  start().then(() => {
    $loading.set(false)
  })

  async function readAndNext(): Promise<void> {
    let promise = Promise.all(
      $list.get().map(i => changePost(i.id, { read: true }))
    )
    if ($hasNext.get()) {
      params.from.set($nextFrom.get())
    } else {
      helpers.renderEmpty()
    }
    return promise.then()
  }

  return {
    $nextFrom,
    exit() {
      exited = true
      unbindFrom()
      unbindAction()
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
