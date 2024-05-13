import { join } from 'node:path'
import yaml from 'yaml'

import {
  completeTasks,
  createCLI,
  enableTestClient,
  fetchAndParsePosts,
  findRSSfromHome,
  finish,
  initializeProgressBar,
  type LoaderTestFeed,
  readText
} from './utils.js'

const FEEDS = join(import.meta.dirname, 'feeds.yml')

interface YamlFeed extends LoaderTestFeed {
  findFromHome?: boolean
}

async function parseFeedsFromFile(path: string): Promise<YamlFeed[]> {
  let data = yaml.parse(await readText(path))
  return data.feeds
}

let cli = createCLI('Run all tests on feeds.yml')

cli.run(async () => {
  enableTestClient()

  let feeds = await parseFeedsFromFile(FEEDS)

  let jobsCount = feeds.length * 2
  initializeProgressBar(jobsCount)

  await completeTasks(feeds.map(feed => () => fetchAndParsePosts(feed.url)))
  for (let feed of feeds) {
    if (feed.findFromHome !== false) {
      await findRSSfromHome(feed)
    }
  }
  finish(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} checked`)
})
