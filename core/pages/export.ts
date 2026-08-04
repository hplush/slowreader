import { atom } from 'nanostores'

import {
  type CategoryValue,
  feedsByCategory,
  loadCategories
} from '../category.ts'
import { getEnvironment } from '../environment.ts'
import { type FeedValue, loadFeeds } from '../feed.ts'
import { type FilterValue, loadFilters } from '../filter.ts'
import { loadPosts, type PostValue } from '../post.ts'
import { withoutMeta } from '../schema.ts'
import {
  preloadImages,
  type Settings,
  theme,
  useQuietCursor,
  useReducedMotion
} from '../settings.ts'
import { createPage } from './common.ts'

export interface StateExport {
  categories: Omit<CategoryValue, 'updatedAt'>[]
  feeds: Omit<FeedValue, 'updatedAt'>[]
  filters: Omit<FilterValue, 'updatedAt'>[]
  posts: Omit<PostValue, 'updatedAt'>[]
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

const NO_OPML_CATEGORY: Record<string, boolean> = {
  general: true
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatCurrentTime(): string {
  let now = new Date()
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  )
}

export const exportPage = createPage('export', () => {
  let stopped = false

  let $exportingOpml = atom(false)

  async function exportOpml(): Promise<void> {
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
      loadCategories(),
      loadFeeds()
    ])
    if (stopped) {
      $exportingOpml.set(false)
      return
    }
    let tree = feedsByCategory(categories, allFeeds)

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
    getEnvironment().saveFile(
      `slowreader-rss-feeds-${formatCurrentTime()}.opml`,
      blob
    )
    $exportingOpml.set(false)
  }

  let $exportingBackup = atom(false)

  async function exportBackup(): Promise<void> {
    $exportingBackup.set(true)
    let state = {
      categories: withoutMeta(await loadCategories()),
      feeds: withoutMeta(await loadFeeds()),
      filters: withoutMeta(await loadFilters()),
      posts: withoutMeta(await loadPosts()),
      settings: {
        preloadImages: preloadImages.get(),
        theme: theme.get(),
        useQuietCursor: useQuietCursor.get(),
        useReducedMotion: useReducedMotion.get()
      }
    } satisfies StateExport

    if (stopped) {
      $exportingBackup.set(false)
      return
    }

    let blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json'
    })
    getEnvironment().saveFile(`slowreader-${formatCurrentTime()}.json`, blob)
    $exportingBackup.set(false)
  }

  return {
    exit() {
      stopped = true
    },
    exportBackup,
    exportingBackup: $exportingBackup,
    exportingOpml: $exportingOpml,
    exportOpml,
    params: {}
  }
})

export type ExportPage = ReturnType<typeof exportPage>
