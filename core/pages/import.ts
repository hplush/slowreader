import { atom, map } from 'nanostores'

import { addCategory } from '../category.ts'
import { addCandidate, addFeed } from '../feed.ts'
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

export const importPage = createPage('import', () => {
  let $importing = atom<false | number | true>(false)
  let $fileError = atom<'brokenFile' | 'cannotRead' | 'unknownFormat' | false>(
    false
  )
  let $feedErrors = map<Record<string, 'unknown' | 'unloadable'>>()

  function startProgress(all: number): () => void {
    let completed = 0
    $importing.set(0)
    return () => {
      completed++
      $importing.set(completed / all)
    }
  }

  async function importOpml(doc: Document): Promise<void> {
    let outlines = doc.getElementsByTagName('outline')
    let links = [...outlines].filter(i => i.getAttribute('xmlUrl'))
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

      let response
      try {
        response = await task.text(url)
      } catch {
        $feedErrors.setKey(url, 'unloadable')
        done()
        continue
      }

      let candidate = getLoaderForText(response)
      if (!candidate) {
        $feedErrors.setKey(url, 'unknown')
      } else {
        await addCandidate(
          candidate,
          { categoryId, title: title ?? candidate.title },
          task,
          response
        )
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
      await addFeed(feed)
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
    $feedErrors.set({})

    let ext = file.name.split('.').pop()?.toLowerCase()
    let content = await readFile(file)
    /* node:coverage ignore next 4 */
    if (content === false) {
      $fileError.set('cannotRead')
      return
    }

    if (ext === 'opml') {
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
  }

  return {
    exit() {},
    feedErrors: $feedErrors,
    fileError: $fileError,
    importFile,
    importing: $importing,
    params: {}
  }
})

export type ImportPage = ReturnType<typeof importPage>
