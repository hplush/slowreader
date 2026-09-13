import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import yaml from 'yaml'

import {
  error,
  finish,
  printAboveProgress,
  startProgress,
  warning
} from '../scripts/progress.ts'
import {
  completeTasks,
  createCLI,
  enableTestClient,
  fetchAndParsePosts,
  findRSSFromHome,
  type LoaderTestFeed,
  readText,
  type Report,
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

// Websites and network are flaky, so on CI a feed fails only on second try
function postpone(enabled: boolean, retry: () => void): Report {
  if (!enabled) return error
  return err => {
    warning(
      `Retrying in a minute: ${err instanceof Error ? err.message : String(err)}`
    )
    retry()
  }
}

let cli = createCLI(
  'Run all tests on feeds.yml',
  '$ pnpm -F loader-tests test:online:loaders [--no-proxy] [--retry]'
)

await cli.run(async args => {
  let proxy = true
  let retry = false
  for (let arg of args) {
    if (arg === '--no-proxy') {
      proxy = false
    } else if (arg === '--retry') {
      retry = true
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

  let failedPosts: string[] = []
  let failedHomes: YamlFeed[] = []
  await completeTasks(
    feeds.map(feed => () => {
      return fetchAndParsePosts(
        feed.url,
        false,
        postpone(retry, () => failedPosts.push(feed.url))
      )
    })
  )
  for (let feed of feeds) {
    if (feed.findFromHome !== false) {
      await findRSSFromHome(
        feed,
        3,
        postpone(retry, () => failedHomes.push(feed))
      )
    }
  }
  if (failedPosts.length + failedHomes.length > 0) {
    printAboveProgress(
      'Waiting a minute before retrying failed feeds',
      'status'
    )
    await setTimeout(60_000)
    await completeTasks(failedPosts.map(url => () => fetchAndParsePosts(url)))
    for (let feed of failedHomes) {
      await findRSSFromHome(feed, 3)
    }
  }
  server?.close()
  finish(`${feeds.length} ${feeds.length === 1 ? 'feed' : 'feeds'} checked`)
})
