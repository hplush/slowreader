import './dom-parser.js'

import {
  createDownloadTask,
  createTextResponse,
  getLoaderForText,
  getTestEnvironment,
  loaders,
  type PreviewCandidate,
  setRequestMethod,
  setupEnvironment
} from '@slowreader/core'
import { readFile } from 'node:fs/promises'

import { LoaderNotFoundError, UnsupportedFileExtError } from './errors.js'
import { isString, isSupportedExt, logger, resolvePath } from './utils.js'

setupEnvironment({ ...getTestEnvironment() })

setRequestMethod(fetch)

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
        title: f.getAttribute('title') || '',
        url: f.getAttribute('xmlUrl')!
      }))

    await Promise.all([...feeds.map(feed => fetchAndParseFeed(feed))])
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
      logger.err(`File not found, path: ${path}. \n`)
    } else if (e instanceof Error) {
      logger.err(`${e.message}\n`)
    } else if (typeof e === 'string') {
      logger.err(e)
    }
  }
}

interface Feed {
  title: string
  url: string
}

async function fetchAndParseFeed(feed: Feed): Promise<void> {
  try {
    let task = createDownloadTask()
    let textResponse = await task.text(feed.url)
    let candidate: false | PreviewCandidate = getLoaderForText(textResponse)
    if (!candidate) {
      throw new LoaderNotFoundError(feed.title)
    }
    let loader = loaders[candidate.loader]
    let { list: posts } = loader.getPosts(task, feed.url, textResponse).get()
    logger.succ(`[Feed] - ${feed.title} - ${feed.url}\n`)
    logger.succ(`• Found ${posts.length} post(s)\n`)
  } catch (e) {
    if (e instanceof Error) {
      logger.err(`${e.message}\n`)
    } else if (typeof e === 'string') {
      logger.err(`${e}\n`)
    }
  }
}

if (process.argv.length > 2) {
  let path = process.argv[2] || ''
  parseFeedsFromFile(path)
} else {
  /**
   *  TODO: Handle errors & show help
   * */
}
