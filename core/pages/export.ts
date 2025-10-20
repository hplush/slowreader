import type { SyncMapValues } from '@logux/actions'
import { type FilterStore, loadValue } from '@logux/client'
import { atom } from 'nanostores'

import {
  type CategoryValue,
  feedsByCategory,
  getCategories
} from '../category.ts'
import { type FeedValue, getFeeds } from '../feed.ts'
import { type FilterValue, getFilters } from '../filter.ts'
import { getPosts, type PostValue } from '../post.ts'
import {
  preloadImages,
  type Settings,
  theme,
  useQuietCursor,
  useReducedMotion
} from '../settings.ts'
import { createPage } from './common.ts'

export interface StateExport {
  categories: Omit<CategoryValue, 'isLoading'>[]
  feeds: Omit<FeedValue, 'isLoading'>[]
  filters: Omit<FilterValue, 'isLoading'>[]
  posts: Omit<PostValue, 'isLoading'>[]
  settings: Settings
}

export function isStateExportFile(state: unknown): state is StateExport {
  return (
    typeof state === 'object' &&
    state !== null &&
    'feeds' in state &&
    Array.isArray(state.feeds) &&
    'categories' in state &&
    Array.isArray(state.categories) &&
    'posts' in state &&
    Array.isArray(state.posts) &&
    'filters' in state &&
    Array.isArray(state.filters) &&
    'settings' in state &&
    typeof state.settings === 'object'
  )
}

async function loadList<Value extends SyncMapValues>(
  filter: FilterStore<Value>
): Promise<Omit<Value, 'isLoading'>[]> {
  return (await loadValue(filter)).list.map(i => {
    let copy = { ...i } as Omit<Value, 'isLoading'>
    delete copy.isLoading
    return copy
  })
}

const NO_OPML_CATEGORY: Record<string, boolean> = {
  broken: true,
  general: true
}

export const exportPage = createPage('export', () => {
  let stopped = false

  let $exportingOpml = atom(false)

  async function exportOpml(): Promise<Blob | false> {
    $exportingOpml.set(true)
    let opml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<opml version="2.0">\n' +
      '  <head>\n' +
      '    <title>SlowReader Feeds</title>\n' +
      `    <dateCreated>${new Date().toISOString()}</dateCreated>\n` +
      '  </head>\n' +
      '  <body>\n'

    let [categories, allFeeds] = await Promise.all([
      loadValue(getCategories()),
      loadValue(getFeeds())
    ])
    if (stopped) return false
    let tree = feedsByCategory(categories.list, allFeeds.list)

    for (let [category, feeds] of tree) {
      if (!NO_OPML_CATEGORY[category.id]) {
        opml += `    <outline text="${category.title}">\n`
      }
      for (let { title, url } of feeds) {
        opml +=
          (NO_OPML_CATEGORY[category.id] ? `    ` : `      `) +
          `<outline text="${title}" type="rss" xmlUrl="${url}" />\n`
      }
      if (!NO_OPML_CATEGORY[category.id]) {
        opml += `    </outline>\n`
      }
    }
    opml += '  </body>\n</opml>\n'

    let blob = new Blob([opml], { type: 'application/xml' })
    $exportingOpml.set(false)
    return blob
  }

  let $exportingState = atom(false)

  async function exportState(): Promise<Blob | false> {
    $exportingState.set(true)
    let state = {
      categories: await loadList(getCategories()),
      feeds: await loadList(getFeeds()),
      filters: await loadList(getFilters()),
      posts: await loadList(getPosts()),
      settings: {
        preloadImages: preloadImages.get(),
        theme: theme.get(),
        useQuietCursor: useQuietCursor.get(),
        useReducedMotion: useReducedMotion.get()
      }
    } satisfies StateExport

    if (stopped) return false

    let blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json'
    })
    $exportingState.set(false)
    return blob
  }

  return {
    exit() {
      stopped = true
    },
    exportingOpml: $exportingOpml,
    exportingState: $exportingState,
    exportOpml,
    exportState,
    params: {}
  }
})

export type ExportPage = ReturnType<typeof exportPage>
