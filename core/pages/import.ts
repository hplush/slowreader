import { atom } from 'nanostores'

import { addCategory } from '../category.ts'
import { addCandidate, addFeed, loadFeedByUrl, loadFeedUrls } from '../feed.ts'
import { importFilters } from '../filter.ts'
import { createDownloadTask } from '../lib/download.ts'
import { parseDocument } from '../lib/html.ts'
import { getLoaderForText } from '../loader/index.ts'
import { addPost } from '../post.ts'
import { GENERAL_CATEGORY } from '../schema.ts'
import { preloadImages, theme } from '../settings.ts'
import { createPage } from './common.ts'
import { isStateExportFile, type StateExport } from './export.ts'

async function readFile(file: File): Promise<false | string> {
  try {
    return await file.text()
    /* node:coverage ignore next 3 */
  } catch {
    return false
  }
}

type FeedError = 'exists' | 'noFeeds' | 'unknown' | 'unloadable'

/**
 * Posts are the biggest rows, so they are added by a few actions
 * instead of a single huge one.
 */
const POSTS_PER_ACTION = 100

export const importPage = createPage('import', () => {
  let $importing = atom<false | number | true>(false)
  let $fileError = atom<
    'brokenFile' | 'cannotRead' | 'noFeeds' | 'unknownFormat' | false
  >(false)
  let $feedErrors = atom<[string, FeedError][]>([])
  let $done = atom<false | number>(false)
  let $lastAdded = atom('')
  let $total = atom(0)
  let added = 0

  function startProgress(all: number): (step?: number) => void {
    $total.set(all)
    let completed = 0
    $importing.set(0)
    return (step = 1) => {
      completed += step
      $importing.set(completed / all)
    }
  }

  function addFeedError(url: string, error: FeedError): void {
    $feedErrors.set([...$feedErrors.get(), [url, error]])
  }

  async function feedExists(url: string): Promise<boolean> {
    return !!(await loadFeedByUrl(url))
  }

  async function importOpml(doc: Document): Promise<void> {
    let outlines = doc.getElementsByTagName('outline')
    let links = [...outlines].filter(i => i.getAttribute('xmlUrl'))
    if (links.length === 0) {
      $fileError.set('noFeeds')
      return
    }
    let task = createDownloadTask()
    let done = startProgress(links.length)

    let categories = new Map<string, string>()
    for (let outline of links) {
      let categoryId = GENERAL_CATEGORY
      let parent = outline.parentElement!
      if (parent.nodeName === 'outline') {
        let category = parent.getAttribute('text')!
        if (!categories.has(category)) {
          let id = await addCategory({ title: category })
          categories.set(category, id)
        }
        categoryId = categories.get(category)!
      }

      let title = outline.getAttribute('text')
      let url = outline.getAttribute('xmlUrl')!

      if (await feedExists(url)) {
        addFeedError(url, 'exists')
        done()
        continue
      }

      let response
      try {
        response = await task.text(url)
      } catch {
        addFeedError(url, 'unloadable')
        done()
        continue
      }

      let candidate = getLoaderForText(response)
      if (!candidate) {
        addFeedError(url, 'unknown')
      } else {
        await addCandidate(
          candidate,
          { categoryId, title: title || candidate.title },
          task,
          response
        )
        $lastAdded.set(candidate.url)
        added++
      }

      done()
    }
  }

  async function importState(json: StateExport): Promise<void> {
    theme.set(json.settings.theme)
    preloadImages.set(json.settings.preloadImages)

    let done = startProgress(
      json.categories.length +
        json.feeds.length +
        json.filters.length +
        json.posts.length
    )

    await addCategory(json.categories)
    done(json.categories.length)

    await importFilters(json.filters)
    done(json.filters.length)

    $total.set(json.feeds.length)
    let urls = new Set(await loadFeedUrls())
    let feeds = json.feeds.filter(feed => {
      if (urls.has(feed.url)) return false
      urls.add(feed.url)
      return true
    })
    await addFeed(feeds)
    added += feeds.length
    done(json.feeds.length)

    for (let i = 0; i < json.posts.length; i += POSTS_PER_ACTION) {
      let batch = json.posts.slice(i, i + POSTS_PER_ACTION)
      await addPost(batch)
      done(batch.length)
    }
  }

  async function importFile(file: File): Promise<void> {
    $importing.set(true)
    $fileError.set(false)
    $feedErrors.set([])
    $done.set(false)
    added = 0

    let ext = file.name.split('.').pop()?.toLowerCase()
    let content = await readFile(file)
    /* node:coverage ignore next 5 */
    if (content === false) {
      $fileError.set('cannotRead')
      $importing.set(false)
      return
    }

    if (ext === 'opml' || ext === 'xml') {
      let doc = parseDocument(content, 'text/xml')
      if (doc.documentElement.nodeName === 'opml') {
        await importOpml(doc)
      } else {
        $fileError.set('brokenFile')
      }
    } else if (ext === 'json') {
      let json
      try {
        json = JSON.parse(content) as unknown
      } catch {}
      if (!json || !isStateExportFile(json)) {
        $fileError.set('brokenFile')
      } else {
        await importState(json)
      }
    } else {
      $fileError.set('unknownFormat')
    }

    $importing.set(false)
    if (!$fileError.get()) {
      $done.set(added)
    }
  }

  return {
    done: $done,
    exit() {},
    feedErrors: $feedErrors,
    fileError: $fileError,
    importFile,
    importing: $importing,
    lastAdded: $lastAdded,
    params: {},
    total: $total
  }
})

export type ImportPage = ReturnType<typeof importPage>
