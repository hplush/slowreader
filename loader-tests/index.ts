import { createDownloadTask, createTextResponse } from '@slowreader/core'
import { readFile } from 'node:fs/promises'

import { LoaderNotFoundError, UnsupportedFileExtError } from './errors.js'
import { getLoader, isString, isSupportedExt, logger } from './utils.js'

async function parseOPML(path: string): Promise<void> {
  try {
    if (!isSupportedExt(path)) {
      throw new UnsupportedFileExtError(path)
    }
    let buffer = await readFile(path)
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
    } else {
      logger.err(`${e}\n`)
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
    let text = await task.text(feed.url)
    let loader = getLoader(text)
    if (!loader) {
      throw new LoaderNotFoundError(feed.title)
    }
    let links = loader.getMineLinksFromText(text, [])
    logger.succ(`Successfully found ${links.length} posts for ${feed.title}!\n`)
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
  parseOPML(path)
} else {
  /**
   *  TODO: Handle errors & show help
   * */
}
