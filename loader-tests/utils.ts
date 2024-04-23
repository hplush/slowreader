import './dom-parser.js'

import {
  createDownloadTask,
  enableTestTime,
  getLoaderForText,
  getTestEnvironment,
  loaders,
  type PreviewCandidate,
  previewCandidates,
  previewCandidatesLoading,
  setBaseTestRoute,
  setPreviewUrl,
  setRequestMethod,
  setupEnvironment,
  userId
} from '@slowreader/core'
import type { ReadableAtom } from 'nanostores'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { styleText } from 'node:util'

export interface LoaderTestFeed {
  htmlUrl: string
  title: string
  url: string
}

export async function readText(path: string): Promise<string> {
  let absolute = path
  if (!isAbsolute(absolute)) {
    absolute = join(process.env.INIT_CWD!, path)
  }
  let buffer = await readFile(absolute)
  return buffer.toString('utf-8')
}

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

export function enableTestClient(): void {
  setupEnvironment(getTestEnvironment())
  enableTestTime()
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
  setRequestMethod(fetch)
}

export function timeout<Value>(
  ms: number,
  promise: Promise<Value>
): Promise<Value> {
  return Promise.race([
    promise,
    new Promise<Value>((resolve, reject) =>
      setTimeout(() => {
        reject(new Error('Timeout'))
      }, ms)
    )
  ])
}

export function waitFor<Value>(
  store: ReadableAtom,
  value: Value
): Promise<void> {
  return new Promise<void>(resolve => {
    let unbind = store.subscribe(state => {
      if (state === value) {
        unbind()
        resolve()
      }
    })
  })
}

interface NoFileError extends Error {
  code: string
  path: string
}

function isNoFileError(e: unknown): e is NoFileError {
  return e instanceof Error && `code` in e && e.code === 'ENOENT'
}

export function print(msg: string): void {
  process.stderr.write(`${msg}\n`)
}

let errors = 0

export function error(err: string | unknown, details?: string): void {
  errors += 1
  let msg: string
  if (isNoFileError(err)) {
    msg = `File not found: ${err.path}`
  } else if (err instanceof Error) {
    msg = err.stack ?? err.message
  } else {
    msg = String(err)
  }
  print('')
  print(
    styleText('bold', styleText('bgRed', ' ERROR ')) +
      ' ' +
      styleText('bold', styleText('red', msg))
  )
  if (details) print(details)
  print('')
}

export function finish(msg: string): void {
  print('')
  let postfix = ''
  if (errors > 0) {
    postfix =
      ', ' + styleText('red', styleText('bold', `${errors} errors found`))
  }
  print(styleText('gray', msg + postfix))
  process.exit(errors > 0 ? 1 : 0)
}

export function success(msg: string, details?: string): void {
  if (details) {
    msg += ` ${styleText('gray', details)}`
  }
  print(styleText('green', styleText('bold', '✓ ') + msg))
}

export async function fetchAndParsePosts(url: string): Promise<void> {
  try {
    let task = createDownloadTask()
    let textResponse = await task.text(url)
    let candidate: false | PreviewCandidate = getLoaderForText(textResponse)
    if (!candidate) {
      error(`Can not found loader for feed ${url}`)
      return
    }
    let loader = loaders[candidate.loader]
    let { list } = loader.getPosts(task, url, textResponse).get()
    if (list.length === 0) {
      error(`Can not found posts for feed ${url}`)
      return
    }
    success(url, list.length + (list.length > 1 ? ' posts' : ' post'))
  } catch (e) {
    error(e, `During loading posts for ${url}`)
  }
}

export async function findRSSfromHome(feed: LoaderTestFeed): Promise<void> {
  let unbindPreview = previewCandidates.listen(() => {})
  try {
    setPreviewUrl(feed.htmlUrl)
    await timeout(10_000, waitFor(previewCandidatesLoading, false))
    if (previewCandidates.get().some(c => c.url === feed.url)) {
      success(`Feed ${feed.title} has feed URL at home`)
    } else if (previewCandidates.get().length === 0) {
      error(
        `Can’t find any feed from home URL or ${feed.title}`,
        `Home URL: ${feed.htmlUrl}\nFeed URL: ${feed.url}`
      )
    } else {
      error(
        `Can’t find ${feed.title} feed from home URL`,
        `Home URL: ${feed.htmlUrl}\n` +
          `Found: ${previewCandidates
            .get()
            .map(i => i.url)
            .join('\n       ')}\n` +
          `Feed URL: ${feed.url}`
      )
    }
  } catch (e) {
    error(
      e,
      `During searching for feed from home URL\n` +
        `Home URL: ${feed.htmlUrl}\n` +
        `Feed URL: ${feed.url}`
    )
  } finally {
    unbindPreview()
  }
}
