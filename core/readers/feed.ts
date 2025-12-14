import {
  ensureLoadedStore,
  type LoadedSyncMap,
  type SyncMapStore
} from '@logux/client'
import { atom } from 'nanostores'

import { type FeedValue, getFeed } from '../feed.ts'
import { waitSyncLoading } from '../lib/stores.ts'
import { changePost, type PostValue } from '../post.ts'
import { createReader, loadPosts } from './common.ts'

const POSTS_PER_PAGE = 50

export const feedReader = createReader('feed', (filter, params, helpers) => {
  if (!filter.categoryId && !filter.feedId) return

  let exited = false
  let $loading = atom(true)
  let $list = atom<LoadedSyncMap<SyncMapStore<PostValue>>[]>([])
  let $authors = atom<Map<string, LoadedSyncMap<SyncMapStore<FeedValue>>>>(
    new Map()
  )
  let $hasNext = atom(false)
  let $nextFrom = atom<number | undefined>()
  let $prevFrom = atom<number | undefined>()

  let openAt = Date.now()
  let unbindFrom = (): void => {}
  async function start(): Promise<void> {
    let posts = await loadPosts(filter)
    if (exited) return

    if (filter.categoryId) {
      let feedIds = new Set<string>()
      posts.forEach(post => {
        feedIds.add(post.get().feedId)
      })
      $authors.set(
        new Map(
          await Promise.all(
            [...feedIds].map(async id => {
              let feed = getFeed(id)
              await waitSyncLoading(feed)
              return [id, ensureLoadedStore(feed)] as const
            })
          )
        )
      )
      // It could be switched to false during await above
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (exited) return
    }

    unbindFrom = params.from.subscribe(value => {
      let from = value ?? openAt
      let fromIndex = posts.findIndex(i => i.get().publishedAt < from)
      if (fromIndex === -1) fromIndex = posts.length
      let list = posts.slice(fromIndex, fromIndex + POSTS_PER_PAGE)
      $hasNext.set(posts.length > fromIndex + POSTS_PER_PAGE)
      if (value) {
        let prevIndex = fromIndex - POSTS_PER_PAGE - 1
        let prevForm = posts[prevIndex]?.get().publishedAt ?? openAt
        $prevFrom.set(prevForm === value ? undefined : prevForm)
      } else {
        $prevFrom.set(undefined)
      }
      $nextFrom.set(list[list.length - 1]?.get().publishedAt)
      $list.set(list)
    })
  }
  start().then(() => {
    $loading.set(false)
  })

  async function readAndNext(): Promise<void> {
    let promise = Promise.all(
      $list.get().map(i => changePost(i.get().id, { read: true }))
    )
    if ($hasNext.get()) {
      params.from.set($nextFrom.get())
    } else {
      helpers.renderEmpty()
    }
    return promise.then()
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
