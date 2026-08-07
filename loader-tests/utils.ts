import './dom-api.ts'

import {
  createDownloadTask,
  enableTestTime,
  generateCredentials,
  getLoaderForText,
  HTTPStatusError,
  pages,
  printWarning,
  type RouteName,
  setRequestMethod,
  setupEnvironment,
  useCredentials,
  waitLoading
} from '@slowreader/core'
import { getTestEnvironment, setBaseTestRoute } from '@slowreader/core/test'
import { readFile } from 'node:fs/promises'
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'
import { isAbsolute, join } from 'node:path'

import {
  error,
  printAboveProgress,
  semiSuccess,
  success,
  warning
} from '../scripts/progress.ts'

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

// Node.js sends `node` and websites with bot protection block it
export const USER_AGENT = 'SlowReader/1.0 (+https://slowreader.app)'

// Node.js gives every IP address only 500 ms to connect and gives up on all
// of them. Slow websites need more time than browsers’ default.
setDefaultAutoSelectFamilyAttemptTimeout(2000)

export function enableTestClient(route: RouteName = 'home'): void {
  setupEnvironment({
    ...getTestEnvironment(),
    warn(e) {
      warning(printWarning(e).title)
    }
  })
  enableTestTime()
  useCredentials(generateCredentials())
  setBaseTestRoute({ params: {}, route })
  setRequestMethod((url, opts = {}) => {
    let headers = new Headers(opts.headers)
    if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT)
    return fetch(url, { ...opts, headers })
  })
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
    let page = candidate.loader.getPosts(task, url, response).get()
    if (page.error) {
      error(page.error)
    } else if (page.list.length === 0) {
      if (badSource) {
        semiSuccess(url, '0 posts')
      } else {
        error(`Can not found posts for feed ${url}`)
      }
    } else {
      success(
        url,
        `${page.list.length}${page.list.length > 1 ? ' posts' : ' post'}`
      )
    }
  } catch (e) {
    if (e instanceof HTTPStatusError && e.status === 429) {
      warning(`Too Many Requests error: ${e.message}`)
    } else {
      error(e, `During loading posts for ${url}`)
    }
  }
}

function normalizeUrl(url: string): string {
  return url
    .replace(/^(https?:)?\/\//, '')
    .replace(/\/\/www\./, '//')
    .replace(/\/$/, '')
    .toLowerCase()
}

export async function findRSSFromHome(
  feed: LoaderTestFeed,
  tries = 0
): Promise<boolean> {
  setBaseTestRoute({ params: {}, route: 'add' })
  let addPage = pages.add()
  let unbindPreview = addPage.candidates.listen(() => {})
  try {
    let homeUrl = feed.homeUrl || getHomeUrl(feed.url)
    addPage.params.url.set(homeUrl)
    try {
      await timeout(10_000, waitLoading(addPage.searching))
    } catch (e) {
      if (e instanceof Error && e.message === 'Timeout' && tries > 0) {
        return await findRSSFromHome(feed, tries - 1)
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
      process.on('unhandledRejection', reason => {
        error(reason)
        process.exit(1)
      })

      let args = process.argv.slice(2)
      if (
        args.includes('--help') ||
        args.includes('-h') ||
        args.includes('help')
      ) {
        printAboveProgress(help)
        if (usage) printAboveProgress('Usage:\n' + usage)
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
      if (usage) printAboveProgress('Usage:\n' + usage)
      process.exit(1)
    }
  }
}
