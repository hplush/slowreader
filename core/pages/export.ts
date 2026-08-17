import { type WithoutMeta, withoutMeta } from '@logux/client/db'
import { atom } from 'nanostores'

import { type CategoryValue, loadCategories } from '../category.ts'
import { getEnvironment } from '../environment.ts'
import { type FeedValue, loadFeeds, loadFeedsByCategory } from '../feed.ts'
import { type FilterValue, loadFilters } from '../filter.ts'
import { loadPostsPage, type PostValue } from '../post.ts'
import { GENERAL_CATEGORY } from '../schema.ts'
import {
  preloadImages,
  type Settings,
  theme,
  useQuietCursor,
  useReducedMotion
} from '../settings.ts'
import { createPage } from './common.ts'

export interface StateExport {
  categories: WithoutMeta<CategoryValue>[]
  feeds: WithoutMeta<FeedValue>[]
  filters: WithoutMeta<FilterValue>[]
  posts: WithoutMeta<PostValue>[]
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

/**
 * Move the text to `Blob` storage, which browsers can put on disk, by every
 * this number of characters. It keeps the whole file out of JS memory.
 */
const CHUNK_SIZE = 65536

const POSTS_PER_PAGE = 100

interface FileWriter {
  save(filename: string): void
  write(text: string): void
}

function createFileWriter(type: string): FileWriter {
  let parts: (Blob | string)[] = []
  let buffer: string[] = []
  let size = 0
  return {
    save(filename) {
      parts.push(new Blob(buffer))
      getEnvironment().saveFile(filename, new Blob(parts, { type }))
    },
    write(text) {
      buffer.push(text)
      size += text.length
      if (size > CHUNK_SIZE) {
        parts.push(new Blob(buffer))
        buffer = []
        size = 0
      }
    }
  }
}

function feedOutline(feed: FeedValue, indent: string): string {
  return (
    `${indent}<outline text="${feed.title}" ` +
    `type="rss" xmlUrl="${feed.url}" />\n`
  )
}

function jsonRows(name: string, rows: object[]): string {
  let json = rows.map(row => `    ${JSON.stringify(row)}`).join(',\n')
  return `  "${name}": [\n${json}\n  ],\n`
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
    let file = createFileWriter('application/xml')
    file.write(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<opml version="2.0">\n' +
        '  <head>\n' +
        '    <title>SlowReader Feeds</title>\n' +
        `    <dateCreated>${new Date().toISOString()}</dateCreated>\n` +
        '  </head>\n' +
        '  <body>\n'
    )

    let categories = await loadCategories()
    for (let feed of await loadFeedsByCategory(GENERAL_CATEGORY)) {
      file.write(feedOutline(feed, '    '))
    }
    for (let category of categories) {
      if (stopped) break
      file.write(`    <outline text="${category.title}">\n`)
      for (let feed of await loadFeedsByCategory(category.id)) {
        file.write(feedOutline(feed, '      '))
      }
      file.write(`    </outline>\n`)
    }
    file.write('  </body>\n</opml>\n')

    if (stopped) {
      $exportingOpml.set(false)
      return
    }
    file.save(`slowreader-rss-feeds-${formatCurrentTime()}.opml`)
    $exportingOpml.set(false)
  }

  let $exportingBackup = atom(false)

  async function exportBackup(): Promise<void> {
    $exportingBackup.set(true)
    let file = createFileWriter('application/json')
    file.write('{\n')
    file.write(jsonRows('categories', withoutMeta(await loadCategories())))
    file.write(jsonRows('feeds', withoutMeta(await loadFeeds())))
    file.write(jsonRows('filters', withoutMeta(await loadFilters())))

    file.write('  "posts": [')
    let total = 0
    while (true) {
      let page = await loadPostsPage(POSTS_PER_PAGE, total)
      if (stopped) break
      for (let post of withoutMeta(page)) {
        file.write(`${total === 0 ? '\n' : ',\n'}    ${JSON.stringify(post)}`)
        total += 1
      }
      if (page.length < POSTS_PER_PAGE) break
    }
    file.write(total === 0 ? '],\n' : '\n  ],\n')

    let settings = {
      preloadImages: preloadImages.get(),
      theme: theme.get(),
      useQuietCursor: useQuietCursor.get(),
      useReducedMotion: useReducedMotion.get()
    } satisfies Settings
    file.write(`  "settings": ${JSON.stringify(settings)}\n}\n`)

    if (stopped) {
      $exportingBackup.set(false)
      return
    }
    file.save(`slowreader-${formatCurrentTime()}.json`)
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
