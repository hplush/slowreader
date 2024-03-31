import './dom-parser.js'

import {
  clearPreview,
  createDownloadTask,
  createTextResponse,
  enableTestTime,
  type EnvironmentAndStore,
  getLoaderForText,
  getTestEnvironment,
  loaders,
  type PreviewCandidate,
  previewCandidates,
  setBaseRoute,
  setPreviewUrl,
  setRequestMethod,
  setupEnvironment,
  userId
} from '@slowreader/core'
import { keepMount } from 'nanostores'
import { readFile } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

import { LoaderNotFoundError, UnsupportedFileExtError } from './errors.js'
import { isString, isSupportedExt, logger, resolvePath } from './utils.js'

interface Feed {
  htmlUrl: string
  title: string
  url: string
}

const timerDurationInSec = 10

async function parseFeedsFromFile(path: string): Promise<void> {
  try {
    if (!isSupportedExt(path)) {
      throw new UnsupportedFileExtError(path)
    }
    let buffer = await readFile(resolvePath(path))
    let text = createTextResponse(buffer.toString('utf-8'))
    let feeds: Feed[] = [...text.parse().querySelectorAll('[type="rss"]')]
      .filter(feed => isString(feed.getAttribute('xmlUrl')))
      .map(f => ({
        htmlUrl: f.getAttribute('htmlUrl')!,
        title: f.getAttribute('title') || '',
        url: f.getAttribute('xmlUrl')!
      }))
    await Promise.all([...feeds.map(feed => fetchAndParsePosts(feed))])
    await Promise.all([...feeds.map(feed => findRSSfromHome(feed))])
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
      logger.err(`File not found on path: "${path}". \n`)
    } else if (e instanceof Error) {
      logger.err(`${e.message}\n`)
    } else if (typeof e === 'string') {
      logger.err(e)
    }
  }
}

async function fetchAndParsePosts(feed: Feed): Promise<void> {
  try {
    let task = createDownloadTask()
    let textResponse = await task.text(feed.url)
    let candidate: false | PreviewCandidate = getLoaderForText(textResponse)
    if (!candidate) {
      throw new LoaderNotFoundError(feed.title)
    }
    let loader = loaders[candidate.loader]
    let { list: posts } = loader.getPosts(task, feed.url, textResponse).get()
    logger.succ(`[Feed] - ${feed.title} - ${feed.url}`)
    logger.succ(`• Found ${posts.length} post(s)\n`)
  } catch (e) {
    if (e instanceof Error) {
      logger.err(`${e.message}\n`)
    } else if (typeof e === 'string') {
      logger.err(`${e}\n`)
    }
  }
}

async function findRSSfromHome(feed: Feed): Promise<void> {
  try {
    keepMount(previewCandidates)
    await setPreviewUrl(feed.htmlUrl)
    await setTimeout(timerDurationInSec * 1000)
    if (previewCandidates.get().length === 0) {
      logger.warn(`For feed ${feed.title} couldn't find RSS from home url.`)
    }
  } catch {
    logger.warn(`For feed ${feed.title} couldn't find RSS from home url`)
  } finally {
    clearPreview()
  }
}

function enableClientTest(env: Partial<EnvironmentAndStore> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  enableTestTime()
  userId.set('10')
  setBaseRoute({ params: {}, route: 'home' })
}

enableClientTest()

setRequestMethod(fetch)

if (process.argv.length < 3) {
  logger.info('Please provide a path to the file.')
  logger.info('Example usage: $ pnpm feed-loader <path_to_your_file.opml>')
} else {
  let path = process.argv[2] || ''
  parseFeedsFromFile(path)
}
