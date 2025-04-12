import { loadValue } from '@logux/client'
import { atom } from 'nanostores'

import {
  feedsByCategory,
  getCategories,
  getCategoryTitle
} from '../category.ts'
import { type FeedValue, getFeeds } from '../feed.ts'
import { type FilterValue, getFilters } from '../filter.ts'
import { getPosts, type PostValue } from '../post.ts'
import { preloadImages, type Settings, theme } from '../settings.ts'
import { createPage } from './common.ts'

export interface StateExport {
  feeds: FeedValue[]
  filters: FilterValue[]
  posts: PostValue[]
  settings: Record<Settings, string>
}

export const exportPage = createPage('export', () => {
  let exited = false

  let $exportingOpml = atom(false)

  async function exportOpml(): Promise<Blob | false> {
    $exportingOpml.set(true)
    let opml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<opml version="2.0">\n' +
      '<head>\n<title>SlowReader Feeds</title>\n</head>\n' +
      '<body>\n'

    let [categories, allFeeds] = await Promise.all([
      loadValue(getCategories()),
      loadValue(getFeeds())
    ])
    if (exited) return false
    let tree = feedsByCategory(categories.list, allFeeds.list)

    for (let [category, feeds] of tree) {
      opml += `<outline text="${getCategoryTitle(category)}">\n`
      for (let { loader, title, url } of feeds) {
        opml += `<outline text="${title}" type="${loader}" xmlUrl="${url}" />\n`
      }
      opml += `</outline>\n`
    }
    opml += '</body>\n</opml>\n'

    let blob = new Blob([opml], { type: 'application/xml' })
    $exportingOpml.set(false)
    return blob
  }

  let $exportingState = atom(false)

  async function exportState(): Promise<Blob | false> {
    $exportingState.set(true)
    let state = {
      feeds: (await loadValue(getFeeds())).list,
      filters: (await loadValue(getFilters())).list,
      posts: (await loadValue(getPosts())).list,
      settings: {
        preloadImages: preloadImages.get(),
        theme: theme.get()
      }
    } satisfies StateExport

    if (exited) return false

    let blob = new Blob([JSON.stringify(state)], { type: 'application/json' })
    $exportingState.set(false)
    return blob
  }

  return {
    exit() {
      exited = true
    },
    exportingOpml: $exportingOpml,
    exportingState: $exportingState,
    exportOpml,
    exportState,
    params: {}
  }
})

export type ExportPage = ReturnType<typeof exportPage>
