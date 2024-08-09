import { createCLI, enableTestClient, findRSSfromHome } from './utils.ts'

let cli = createCLI(
  'Debug feed search with specific feed',
  '$ pnpm run home FEED_URL\n$ pnpm url FEED_URL HOME_URL'
)

cli.run(async args => {
  enableTestClient()

  let url = args[0]
  let homeUrl = args[1]
  if (!url) {
    cli.wrongArg('Please provide a feed URL')
    return
  }

  process.exit((await findRSSfromHome({ homeUrl, title: url, url })) ? 0 : 1)
})
