import { createCLI, enableTestClient, fetchAndParsePosts } from './utils.js'

let cli = createCLI('Debug post loading with specific feed', '$ pnpm url URL')

cli.run(async args => {
  enableTestClient()

  let url = args[0]
  if (!url) {
    cli.wrongArg('Please provide a feed URL')
    return
  }

  await fetchAndParsePosts(url)
})
