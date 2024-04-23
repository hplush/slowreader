import { createTextResponse } from '@slowreader/core'

import {
  enableTestClient,
  error,
  type Feed,
  fetchAndParsePosts,
  findRSSfromHome,
  finish,
  isString,
  readText
} from './utils.js'

async function parseFeedsFromFile(path: string): Promise<Feed[]> {
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
        }) as Feed
    )
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
    await Promise.all(feeds.map(feed => fetchAndParsePosts(feed.url)))
    for (let feed of feeds) {
      await findRSSfromHome(feed)
    }
    finish(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} checked`)
  } catch (e) {
    error(e)
    process.exit(1)
  }
}
