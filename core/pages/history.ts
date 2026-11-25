import { atom, effect } from 'nanostores'

import { clearHistory, getHistory, type HistoryPost } from '../post.ts'
import { openedDatabase } from '../schema.ts'
import { createPage } from './common.ts'

export const historyPage = createPage('history', () => {
  let $limit = atom(50)
  let $posts = atom<HistoryPost[]>([])
  let $hasMore = atom(false)
  let $loading = atom(true)
  let $clearing = atom(false)

  let unbind = effect([openedDatabase, $limit], (db, limit) => {
    if (!db) return
    return getHistory(limit).subscribe(rows => {
      if (rows.status !== 'ready') return
      $posts.set(rows.value.slice(0, limit))
      $hasMore.set(rows.value.length > limit)
      $loading.set(false)
    })
  })

  return {
    async clear() {
      $clearing.set(true)
      try {
        await clearHistory()
      } finally {
        $clearing.set(false)
      }
    },
    clearing: $clearing,
    exit() {
      unbind()
    },
    hasMore: $hasMore,
    loading: $loading,
    params: {},
    posts: $posts,
    showMore() {
      $limit.set($limit.get() + 50)
    }
  }
})

export type HistoryPage = ReturnType<typeof historyPage>
