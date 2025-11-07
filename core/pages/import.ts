import { loadValue } from '@logux/client'
import { atom } from 'nanostores'

import { addCategory } from '../category.ts'
import { addCandidate, addFeed, getFeeds } from '../feed.ts'
import { addFilter } from '../filter.ts'
import { createDownloadTask } from '../lib/download.ts'
import { getLoaderForText } from '../loader/index.ts'
import { addPost } from '../post.ts'
import { preloadImages, theme } from '../settings.ts'
import { createPage } from './common.ts'
import { isStateExportFile, type StateExport } from './export.ts'

async function readFile(file: File): Promise<false | string> {
  return new Promise(resolve => {
    let reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    /* node:coverage ignore next 3 */
    reader.onerror = () => {
      resolve(false)
    }
    reader.readAsText(file)
  })
}

type FeedError = 'exists' | 'noFeeds' | 'unknown' | 'unloadable'

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

  function startProgress(all: number): () => void {
    $total.set(all)
    let completed = 0
    $importing.set(0)
    return () => {
      completed++
      $importing.set(completed / all)
    }
  }

  function addFeedError(url: string, error: FeedError): void {
    $feedErrors.set([...$feedErrors.get(), [url, error]])
  }

  async function feedExists(url: string): Promise<boolean> {
    let feeds = await loadValue(getFeeds({ url }))
    return feeds.list.some(i => !feeds.stores.get(i.id)!.deleted)
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
      let categoryId = 'general'
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
          { categoryId, title: title ?? candidate.title },
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

    for (let category of json.categories) {
      await addCategory(category)
      done()
    }
    for (let filter of json.filters) {
      await addFilter(filter)
      done()
    }
    for (let feed of json.feeds) {
      if (!(await feedExists(feed.url))) {
        await addFeed(feed)
        added++
      }
      done()
    }
    for (let post of json.posts) {
      await addPost(post)
      done()
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
      let parser = new DOMParser()
      let doc = parser.parseFromString(content, 'text/xml')
      if (doc.documentElement.nodeName === 'opml') {
        await importOpml(doc)
      } else {
        $fileError.set('brokenFile')
      }
    } else if (ext === 'json') {
      let json
      try {
        json = JSON.parse(content)
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
