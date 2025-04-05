import './dom-parser.ts'

import {
  createDownloadTask,
  enableTestTime,
  getLoaderForText,
  getTestEnvironment,
  pages,
  setBaseTestRoute,
  setRequestMethod,
  setupEnvironment,
  userId,
  waitLoading
} from '@slowreader/core'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import readline from 'node:readline'
import { isatty } from 'node:tty'
import { styleText } from 'node:util'

export interface LoaderTestFeed {
  homeUrl?: string
  title: string
  url: string
}

export async function readText(path: string): Promise<string> {
  let absolute = path
  if (!isAbsolute(absolute)) {
    absolute = join(process.env.INIT_CWD ?? process.cwd(), path)
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

interface NoFileError extends Error {
  code: string
  path: string
}

function isNoFileError(e: unknown): e is NoFileError {
  return e instanceof Error && `code` in e && e.code === 'ENOENT'
}

let progress = 0
let totalJobs = 0

export function initializeProgressBar(totalValue: number): void {
  if (!process.env.CI) {
    totalJobs = totalValue
    renderProgressBar()
  }
}

function renderProgressBar(): void {
  let filled = Math.floor((process.stderr.columns * progress) / totalJobs)
  process.stderr.write(
    '█'.repeat(filled) + '░'.repeat(process.stderr.columns - filled) + '\n'
  )
  readline.moveCursor(process.stderr, 0, 0)
}

const SIMPLE_SHELL = !isatty(1) || process.env.CI

function updateProgressBar(): void {
  if (totalJobs > 0 && progress < totalJobs && !SIMPLE_SHELL) {
    progress += 1
    readline.moveCursor(process.stderr, 0, -1)
    readline.clearLine(process.stderr, 0)
    if (progress < totalJobs) {
      renderProgressBar()
    }
  }
}

export function print(msg: string): void {
  if (totalJobs > 0 && progress < totalJobs && !SIMPLE_SHELL) {
    readline.moveCursor(process.stderr, 0, -1)
    readline.clearLine(process.stderr, 0)
    process.stderr.write(`${msg}\n`)
    renderProgressBar()
  } else {
    process.stderr.write(`${msg}\n`)
  }
}

let errors = 0

export function error(err: unknown, details?: string): void {
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
  updateProgressBar()
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
  updateProgressBar()
}

export function semiSuccess(msg: string, note: string): void {
  print(
    styleText(
      'yellow',
      styleText('bold', '✓ ') + msg + ' ' + styleText('bold', note)
    )
  )
  updateProgressBar()
}

export async function fetchAndParsePosts(
  url: string,
  badSource = false
): Promise<void> {
  try {
    let task = createDownloadTask()
    let response = await task.text(url)
    if (badSource && response.status >= 400) {
      semiSuccess(url, `${response.status}`)
      return
    }
    if (
      badSource &&
      response.redirected &&
      response.contentType === 'text/html' &&
      response.text.toLocaleLowerCase().includes('<html')
    ) {
      semiSuccess(url, `redirect to HTML`)
      return
    }
    let candidate = getLoaderForText(response)
    if (!candidate) {
      error(`Can not found loader for feed ${url}`)
      return
    }
    let { list } = candidate.loader.getPosts(task, url, response).get()
    if (list.length === 0) {
      if (badSource) {
        semiSuccess(url, '0 posts')
      } else {
        error(`Can not found posts for feed ${url}`)
      }
    } else {
      success(url, `${list.length}${list.length > 1 ? ' posts' : ' post'}`)
    }
  } catch (e) {
    error(e, `During loading posts for ${url}`)
  }
}

function normalizeUrl(url: string): string {
  return url
    .replace(/^(https?:)?\/\//, '')
    .replace(/\/\/www\./, '//')
    .replace(/\/$/, '')
    .toLowerCase()
}

export async function findRSSfromHome(
  feed: LoaderTestFeed,
  tries = 0
): Promise<boolean> {
  setBaseTestRoute({ params: {}, route: 'add' })
  let addPage = pages.add()
  let unbindPreview = addPage.candidates.listen(() => {})
  try {
    let homeUrl = feed.homeUrl || getHomeUrl(feed.url)
    addPage.setUrl(homeUrl)
    try {
      await timeout(10_000, waitLoading(addPage.searching))
    } catch (e) {
      if (e instanceof Error && e.message === 'Timeout' && tries > 0) {
        return await findRSSfromHome(feed, tries - 1)
      } else {
        throw e
      }
    }
    let normalizedUrls = addPage.candidates.get().map(i => normalizeUrl(i.url))
    if (normalizedUrls.includes(normalizeUrl(feed.url))) {
      success(`Feed ${feed.title} has feed URL at home`)
      return true
    } else if (addPage.candidates.get().length === 0) {
      error(
        `Can’t find any feed from home URL or ${feed.title}`,
        `Home URL: ${homeUrl}\nFeed URL: ${feed.url}`
      )
      return false
    } else {
      error(
        `Can’t find ${feed.title} feed from home URL`,
        `Home URL: ${homeUrl}\n` +
          `Found: ${addPage.candidates
            .get()
            .map(i => i.url)
            .join('\n       ')}\n` +
          `Feed URL: ${feed.url}`
      )
      return false
    }
  } catch (e) {
    error(
      e,
      `During searching for feed from home URL\n` +
        `Home URL: ${feed.homeUrl}\n` +
        `Feed URL: ${feed.url}`
    )
    return false
  } finally {
    unbindPreview()
  }
}

export async function completeTasks(
  tasks: (() => Promise<void>)[]
): Promise<void> {
  return new Promise(resolve => {
    let running = 4

    function runTask(): void {
      let task = tasks.pop()
      if (task) {
        task()
          .then(runTask)
          .catch((e: unknown) => {
            throw e
          })
      } else {
        running -= 1
        if (running === 0) resolve()
      }
    }

    for (let i = 0; i < running; i++) {
      runTask()
    }
  })
}

function getHomeUrl(feedUrl: string): string {
  let url = new URL(feedUrl)
  url.pathname = '/'
  return url.toString()
}

export interface CLI {
  run(cb: (args: string[]) => Promise<void> | void): Promise<void>
  wrongArg(message: string): void
}

export function createCLI(help: string, usage?: string): CLI {
  return {
    async run(cb) {
      let args = process.argv.slice(2)
      if (
        args.includes('--help') ||
        args.includes('-h') ||
        args.includes('help')
      ) {
        print(help)
        if (usage) print('Usage:\n' + usage)
        process.exit(0)
      } else {
        try {
          await cb(args)
        } catch (e) {
          error(e)
          process.exit(1)
        }
      }
    },
    wrongArg(message) {
      error(message)
      if (usage) print('Usage:\n' + usage)
      process.exit(1)
    }
  }
}
