import { SUBPROTOCOL } from '@slowreader/api'
import { atom } from 'nanostores'

import { addAccount } from '../account.ts'
import { busyDuring } from '../busy.ts'
import { addCategory, loadCategories } from '../category.ts'
import { deleteDemo } from '../demo.ts'
import { addCandidate, addFeed, loadFeedByUrl, loadFeedUrls } from '../feed.ts'
import { importFilters } from '../filter.ts'
import { createDownloadTask } from '../lib/download.ts'
import { parseDocument } from '../lib/html.ts'
import { getLoaderForText } from '../loader/index.ts'
import { importMessages } from '../messages/index.ts'
import { addPost } from '../post.ts'
import { GENERAL_CATEGORY } from '../schema.ts'
import {
  customPostFont,
  fastPostsMaxAge,
  nightLock,
  openWarnings,
  postFont,
  postLineHeight,
  showSensitiveMedia,
  textSize,
  theme
} from '../settings.ts'
import { isDemo } from '../welcome.ts'
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
  let $fileError = atom<
    | 'brokenFile'
    | 'cannotRead'
    | 'newBackup'
    | 'noFeeds'
    | 'oldBackup'
    | 'unknownFormat'
    | false
  >(false)
  let $feedErrors = atom<[string, FeedError][]>([])
  let $done = atom<false | number>(false)
  let $lastAdded = atom('')
  let $total = atom(0)
  let added = 0

  function startProgress(
    setProgress: (progress: number) => void,
    all: number
  ): (step?: number) => void {
    $total.set(all)
    let completed = 0
    setProgress(0)
    return (step = 1) => {
      completed += step
      setProgress(completed / all)
    }
  }

  function addFeedError(url: string, error: FeedError): void {
    $feedErrors.set([...$feedErrors.get(), [url, error]])
  }

  async function feedExists(url: string): Promise<boolean> {
    return !!(await loadFeedByUrl(url))
  }

  async function importOpml(
    doc: Document,
    setProgress: (progress: number) => void
  ): Promise<void> {
    let outlines = doc.getElementsByTagName('outline')
    let links = [...outlines].filter(i => i.getAttribute('xmlUrl'))
    if (links.length === 0) {
      $fileError.set('noFeeds')
      return
    }
    if (isDemo.get()) await deleteDemo()
    let task = createDownloadTask()
    let done = startProgress(setProgress, links.length)

    let categories = new Map(
      (await loadCategories()).map(category => [category.title, category.id])
    )
    for (let outline of links) {
      let parent = outline.parentElement!
      let category =
        parent.nodeName === 'outline' ? parent.getAttribute('text')! : undefined

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

      let candidate = await getLoaderForText(response, task, url)
      if (!candidate) {
        addFeedError(url, 'unknown')
      } else if (await feedExists(candidate.url)) {
        // Redirects move the feed to another URL, so the check before
        // the download can’t see the feed added by the previous import
        addFeedError(url, 'exists')
      } else {
        // The category is created only here to not leave empty categories
        // after an import where every feed was already added
        let categoryId = GENERAL_CATEGORY
        if (category) {
          if (!categories.has(category)) {
            categories.set(category, await addCategory({ title: category }))
          }
          categoryId = categories.get(category)!
        }
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

  async function importState(
    json: StateExport,
    setProgress: (progress: number) => void
  ): Promise<void> {
    if (isDemo.get()) await deleteDemo()
    let { settings } = json
    if (settings.theme) theme.set(settings.theme)
    if (settings.textSize) textSize.set(settings.textSize)
    if (settings.postFont) postFont.set(settings.postFont)
    if (settings.postLineHeight) postLineHeight.set(settings.postLineHeight)
    if (settings.customPostFont) customPostFont.set(settings.customPostFont)
    if (settings.fastPostsMaxAge !== undefined) {
      fastPostsMaxAge.set(settings.fastPostsMaxAge)
    }
    if (settings.nightLock) nightLock.set(settings.nightLock)
    if (settings.openWarnings !== undefined) {
      openWarnings.set(settings.openWarnings)
    }
    if (settings.showSensitiveMedia !== undefined) {
      showSensitiveMedia.set(settings.showSensitiveMedia)
    }

    let done = startProgress(
      setProgress,
      json.accounts.length +
        json.categories.length +
        json.feeds.length +
        json.filters.length +
        json.posts.length
    )

    let accountIds = new Map<string, string>()
    for (let account of json.accounts) {
      accountIds.set(account.id, await addAccount(account))
    }
    function toAccountId(id: null | string): null | string {
      return id && (accountIds.get(id) ?? id)
    }
    done(json.accounts.length)

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
    await addFeed(
      feeds.map(feed => ({ ...feed, accountId: toAccountId(feed.accountId) }))
    )
    added += feeds.length
    done(json.feeds.length)

    for (let i = 0; i < json.posts.length; i += POSTS_PER_ACTION) {
      let batch = json.posts.slice(i, i + POSTS_PER_ACTION)
      await addPost(
        batch.map(post => ({ ...post, accountId: toAccountId(post.accountId) }))
      )
      done(batch.length)
    }
  }

  function importFile(file: File): Promise<void> {
    return busyDuring(
      importMessages.get().importing,
      async setProgress => {
        $fileError.set(false)
        $feedErrors.set([])
        $done.set(false)
        added = 0

        let ext = file.name.split('.').pop()?.toLowerCase()
        let content = await readFile(file)
        /* node:coverage ignore next 4 */
        if (content === false) {
          $fileError.set('cannotRead')
          return
        }

        if (ext === 'opml' || ext === 'xml') {
          let doc = parseDocument(content, 'text/xml')
          // Browsers keep the part parsed before the error and put
          // `parsererror` in it, so a broken file must not be half-imported
          if (
            doc.documentElement.nodeName === 'opml' &&
            doc.getElementsByTagName('parsererror').length === 0
          ) {
            await importOpml(doc, setProgress)
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
          } else if (json.subprotocol !== SUBPROTOCOL) {
            $fileError.set(
              (json.subprotocol ?? 0) > SUBPROTOCOL ? 'newBackup' : 'oldBackup'
            )
          } else {
            await importState(json, setProgress)
          }
        } else {
          $fileError.set('unknownFormat')
        }

        if (!$fileError.get()) {
          $done.set(added)
        }
      },
      true
    )
  }

  return {
    done: $done,
    exit() {},
    feedErrors: $feedErrors,
    fileError: $fileError,
    importFile,
    lastAdded: $lastAdded,
    params: {},
    total: $total
  }
})

export type ImportPage = ReturnType<typeof importPage>
