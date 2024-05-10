import {
  createCLI,
  enableTestClient,
  fetchAndParsePosts,
  findRSSfromHome
} from './utils.js'

let cli = createCLI('Debug loaders with specific feed', '$ pnpm url URL')

cli.run(async args => {
  enableTestClient()

  let url = args[0]
  if (!url) {
    cli.wrongArg('Please provide a feed URL')
    return
  }

  await fetchAndParsePosts(url)
  if (!(await findRSSfromHome({ title: url, url }))) {
    process.exit(1)
  }
})
