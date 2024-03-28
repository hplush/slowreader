import { readFile } from 'node:fs/promises'

import { createDownloadTask, createTextResponse } from '@slowreader/core'
import { LoaderNotFoundError, UnsupportedFileExtError } from './errors.js'
import { getLoader, isString, isSupportedExt, picoLogger } from './utils.js'

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
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      picoLogger.err(`File not found, path: ${path}. \n`)
    } else {
      picoLogger.err(`${error.message}\n`)
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
    picoLogger.succ(
      `Successfully found ${links.length} posts for ${feed.title}!\n`
    )
  } catch (error: any) {
    picoLogger.err(`${error.message}\n`)
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
