import { createTextResponse } from '@slowreader/core'

import {
  completeTasks,
  createCLI,
  enableTestClient,
  error,
  fetchAndParsePosts,
  findRSSfromHome,
  finish,
  isString,
  type LoaderTestFeed as OpmlFeed,
  readText
} from './utils.js'

async function parseFeedsFromFile(path: string): Promise<OpmlFeed[]> {
  if (!path.endsWith('.opml') && !path.endsWith('.xml')) {
    error(`Unsupported file extension found on ${path}`)
    process.exit(1)
  }
  let text = createTextResponse(await readText(path))
  return [...text.parseXml()!.querySelectorAll('[type="rss"]')]
    .filter(feed => isString(feed.getAttribute('xmlUrl')))
    .map(
      f =>
        ({
          homeUrl: f.getAttribute('htmlUrl')!,
          title: f.getAttribute('title') || '',
          url: f.getAttribute('xmlUrl')!
        }) as OpmlFeed
    )
}

let cli = createCLI(
  'Test all feeds from user OPML',
  '$ pnpm check-opml PATH_TO_YOUR_FILE.opml'
)

enableTestClient()

cli.run(async args => {
  let opmlFile = args[0]
  if (!opmlFile) {
    cli.wrongArg('Please provide a path to the OPML file')
    return
  }

  let feeds = await parseFeedsFromFile(opmlFile)
  await completeTasks(feeds.map(feed => () => fetchAndParsePosts(feed.url)))
  for (let feed of feeds) {
    await findRSSfromHome(feed)
  }

  finish(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} checked`)
})
