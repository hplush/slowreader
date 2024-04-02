import './dom-parser.js'

import {
  createDownloadTask,
  createTextResponse,
  getLoaderForText,
  loaders,
  type PreviewCandidate,
  previewCandidates,
  previewCandidatesLoading,
  setPreviewUrl
} from '@slowreader/core'

import {
  enableTestClient,
  error,
  isString,
  OurError,
  readText,
  success,
  timeout,
  warn
} from './utils.js'

interface OpmlFeed {
  htmlUrl: string
  title: string
  url: string
}

async function parseFeedsFromFile(path: string): Promise<OpmlFeed[]> {
  if (!path.endsWith('.opml') && !path.endsWith('.xml')) {
    throw new OurError(`Unsupported file extension found on ${path}`)
  }
  let text = createTextResponse(await readText(path))
  return [...text.parse().querySelectorAll('[type="rss"]')]
    .filter(feed => isString(feed.getAttribute('xmlUrl')))
    .map(
      f =>
        ({
          htmlUrl: f.getAttribute('htmlUrl')!,
          title: f.getAttribute('title') || '',
          url: f.getAttribute('xmlUrl')!
        }) as OpmlFeed
    )
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

let loadingPromises: (() => void)[] = []

previewCandidatesLoading.listen(loading => {
  if (!loading) {
    for (let resolve of loadingPromises) {
      resolve()
    }
    loadingPromises = []
  }
})

function waitForCandidates(): Promise<void> {
  return new Promise<void>(resolve => {
    loadingPromises.push(resolve)
  })
}

async function findRSSfromHome(feed: OpmlFeed): Promise<void> {
  let unbindPreview = previewCandidates.listen(() => {})
  try {
    setPreviewUrl(feed.htmlUrl)
    await timeout(5000, waitForCandidates())
    if (previewCandidates.get().length === 0) {
      warn(`For feed ${feed.title} couldn't find RSS from home url`)
    }
  } catch (e) {
    error(e)
  } finally {
    unbindPreview()
  }
}

enableTestClient()

if (process.argv.length < 3) {
  error('Please provide a path to the file')
  error('Example usage: $ pnpm check-opml PATH_TO_YOUR_FILE.opml')
  process.exit(1)
} else {
  try {
    let feeds = await parseFeedsFromFile(process.argv[2]!)
    await Promise.all(feeds.map(feed => fetchAndParsePosts(feed)))
    for (let feed of feeds) {
      await findRSSfromHome(feed)
    }
  } catch (e) {
    error(e)
    process.exit(1)
  }
}
