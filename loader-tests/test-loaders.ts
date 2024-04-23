import yaml from 'yaml'

import {
  enableTestClient,
  error,
  type Feed,
  fetchAndParsePosts,
  findRSSfromHome,
  finish,
  readText
} from './utils.js'

interface YamlFeed extends Feed {
  findFromHome: boolean
}

async function parseFeedsFromFile(path: string): Promise<YamlFeed[]> {
  let data = yaml.parse(await readText(path))
  return data.feeds
}

enableTestClient()

try {
  let feeds = await parseFeedsFromFile(process.argv[2]!)
  await Promise.all(feeds.map(feed => fetchAndParsePosts(feed.url)))
  for (let feed of feeds) {
    if (feed.findFromHome) {
      await findRSSfromHome(feed)
    }
  }
  finish(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} checked`)
} catch (e) {
  error(e)
  process.exit(1)
}
