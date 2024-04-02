import './dom-parser.js'

import {
  clearPreview,
  createDownloadTask,
  createTextResponse,
  getLoaderForText,
  loaders,
  type PreviewCandidate,
  previewCandidates,
  previewCandidatesLoading,
  setPreviewUrl
} from '@slowreader/core'
import { keepMount } from 'nanostores'

import {
  enableTestClient,
  error,
  isString,
  OurError,
  readText,
  success,
  waitForStoreResolve,
  warn
} from './utils.js'

interface OpmlFeed {
  htmlUrl: string
  title: string
  url: string
}

async function parseFeedsFromFile(path: string): Promise<void> {
  try {
    if (!path.endsWith('.opml') && !path.endsWith('.xml')) {
      throw new OurError(`Unsupported file extension found on ${path}`)
    }
    let text = createTextResponse(await readText(path))
    let feeds = [...text.parse().querySelectorAll('[type="rss"]')]
      .filter(feed => isString(feed.getAttribute('xmlUrl')))
      .map(
        f =>
          ({
            htmlUrl: f.getAttribute('htmlUrl')!,
            title: f.getAttribute('title') || '',
            url: f.getAttribute('xmlUrl')!
          }) as OpmlFeed
      )
    await Promise.all([...feeds.map(feed => fetchAndParsePosts(feed))])
    await Promise.all([...feeds.map(feed => findRSSfromHome(feed))])
  } catch (e) {
    error(e)
  }
}

async function fetchAndParsePosts(feed: OpmlFeed): Promise<void> {
  try {
    let task = createDownloadTask()
    let textResponse = await task.text(feed.url)
    let candidate: false | PreviewCandidate = getLoaderForText(textResponse)
    if (!candidate) {
      throw new OurError(`Loader not found for feed ${feed.title}`)
    }
    let loader = loaders[candidate.loader]
    let { list: posts } = loader.getPosts(task, feed.url, textResponse).get()
    success(`[Feed] - ${feed.title} - ${feed.url}`)
    success(`• Found ${posts.length} post(s)\n`)
  } catch (e) {
    error(e)
  }
}

async function findRSSfromHome(feed: OpmlFeed): Promise<void> {
  try {
    keepMount(previewCandidates)
    keepMount(previewCandidatesLoading)
    await setPreviewUrl(feed.htmlUrl)
    await waitForStoreResolve(previewCandidatesLoading)
    if (previewCandidates.get().length === 0) {
      warn(`For feed ${feed.title} couldn't find RSS from home url`)
    }
  } catch {
    warn(`For feed ${feed.title} couldn't find RSS from home url`)
  } finally {
    clearPreview()
  }
}

enableTestClient()

if (process.argv.length < 3) {
  error('Please provide a path to the file')
  error('Example usage: $ pnpm check-opml PATH_TO_YOUR_FILE.opml')
} else {
  let path = process.argv[2] || ''
  parseFeedsFromFile(path)
}
