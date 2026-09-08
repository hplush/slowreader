import { join } from 'node:path'
import yaml from 'yaml'

import { finish, startProgress } from '../scripts/progress.ts'
import {
  completeTasks,
  createCLI,
  enableTestClient,
  fetchAndParsePosts,
  findRSSFromHome,
  type LoaderTestFeed,
  readText,
  useProxy
} from './utils.ts'

const FEEDS = join(import.meta.dirname, 'feeds.yml')

interface YamlFeed extends LoaderTestFeed {
  findFromHome?: boolean
}

async function parseFeedsFromFile(path: string): Promise<YamlFeed[]> {
  let data = yaml.parse(await readText(path)) as { feeds: YamlFeed[] }
  return data.feeds
}

let cli = createCLI(
  'Run all tests on feeds.yml',
  '$ pnpm -F loader-tests test:online:loaders [--no-proxy]'
)

await cli.run(async args => {
  let proxy = true
  for (let arg of args) {
    if (arg === '--no-proxy') {
      proxy = false
    } else {
      cli.wrongArg('Unknown argument: ' + arg)
      return
    }
  }

  enableTestClient()
  let server = proxy ? useProxy() : undefined

  let feeds = await parseFeedsFromFile(FEEDS)
  startProgress(
    feeds.length + feeds.filter(feed => feed.findFromHome !== false).length
  )

  await completeTasks(feeds.map(feed => () => fetchAndParsePosts(feed.url)))
  for (let feed of feeds) {
    if (feed.findFromHome !== false) {
      await findRSSFromHome(feed, 3)
    }
  }
  server?.close()
  finish(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} checked`)
})
