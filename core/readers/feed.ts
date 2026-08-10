import { atom } from 'nanostores'

import { type FeedValue, loadFeedsByCategory } from '../feed.ts'
import { changePost, type PostValue } from '../post.ts'
import { createReader, loadPosts } from './common.ts'

const POSTS_PER_PAGE = 40

export const feedReader = createReader('feed', (filter, params, helpers) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<PostValue[]>([])
  let $authors = atom<Map<string, FeedValue>>(new Map())
  let $hasNext = atom(false)
  let $nextFrom = atom<number | undefined>()
  let $prevFrom = atom<number | undefined>()

  let openAt = Date.now()
  let unbindFrom = (): void => {}
  async function start(): Promise<void> {
    // TODO: more optimized feed to now keep everything in memory
    let posts = await loadPosts(filter)
    if (exited) return

    if (filter.categoryId) {
      let feeds = await loadFeedsByCategory(filter.categoryId)
      $authors.set(new Map(feeds.map(feed => [feed.id, feed])))
      // It could be switched to false during await above
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (exited) return
    }

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
  void start().then(() => {
    $loading.set(false)
  })

  async function readAndNext(): Promise<void> {
    let unread = $list.get().filter(i => !i.read)
    let promise = changePost(
      unread.map(i => i.id),
      { read: 1 }
    )
    // Loaded posts are a snapshot, so we need to mark them as read too
    for (let post of unread) post.read = 1
    if ($hasNext.get()) {
      params.from.set($nextFrom.get())
    } else {
      helpers.renderEmpty()
    }
    return promise
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
