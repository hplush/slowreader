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
  finish,
  isString,
  readText,
  success,
  timeout,
  waitFor
} from './utils.js'

interface OpmlFeed {
  htmlUrl: string
  title: string
  url: string
}

async function parseFeedsFromFile(path: string): Promise<OpmlFeed[]> {
  if (!path.endsWith('.opml') && !path.endsWith('.xml')) {
    error(`Unsupported file extension found on ${path}`)
    process.exit(1)
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
      error(`Can not found loader for feed ${feed.url}`)
      return
    }
    let loader = loaders[candidate.loader]
    let { list } = loader.getPosts(task, feed.url, textResponse).get()
    if (list.length === 0) {
      error(`Can not found posts for feed ${feed.url}`)
      return
    }
    success(feed.url, list.length + (list.length > 1 ? ' posts' : ' post'))
  } catch (e) {
    error(e, `During loading posts for ${feed.url}`)
  }
}

async function findRSSfromHome(feed: OpmlFeed): Promise<void> {
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

enableTestClient()

if (process.argv.length < 3) {
  error(
    'Please provide a path to the file',
    'Example usage:\n$ pnpm check-opml PATH_TO_YOUR_FILE.opml'
  )
  process.exit(1)
} else {
  try {
    let feeds = await parseFeedsFromFile(process.argv[2]!)
    await Promise.all(feeds.map(feed => fetchAndParsePosts(feed)))
    for (let feed of feeds) {
      await findRSSfromHome(feed)
    }
    finish(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} checked`)
  } catch (e) {
    error(e)
    process.exit(1)
  }
}
