import { importMessages, pages, waitLoading } from '@slowreader/core'

import {
  createCLI,
  enableTestClient,
  error,
  fetchAndParsePosts,
  finish,
  initializeProgressBar,
  readText
} from './utils.ts'

let cli = createCLI(
  'Test all feeds from user OPML',
  '$ pnpm check-opml PATH_TO_YOUR_FILE.opml'
)

cli.run(async args => {
  enableTestClient('import')
  let page = pages.import()

  let opmlFile: string | undefined
  for (let arg of args) {
    if (!opmlFile) {
      opmlFile = arg
    } else {
      cli.wrongArg('Unknown argument: ' + arg)
      return
    }
  }

  if (!opmlFile) {
    cli.wrongArg('Please provide a path to the OPML file')
    return
  }

  let content = await readText(opmlFile)
  let file = new File([content], opmlFile, { type: 'application/xml' })

  function checkDone(): void {
    let done = page.done.get()
    if (done !== false) {
      finish(`${done} ${done === 1 ? 'feed' : 'feeds'} tested successfully`)
    }
  }

  let unbindTotal = page.total.listen(all => {
    initializeProgressBar(all)
    unbindTotal()
  })
  let unbindLastAdded = page.lastAdded.listen(async url => {
    await fetchAndParsePosts(url, true)
    checkDone()
  })

  let unbindFeedErrors = page.feedErrors.listen(list => {
    let last = list[list.length - 1]
    if (last) {
      error(importMessages.get()[`${last[1]}Error`], last[0])
      checkDone()
    }
  })

  page.importFile(file)
  await waitLoading(page.importing)
  unbindLastAdded()
  unbindFeedErrors()

  let fileError = page.fileError.get()
  if (fileError) {
    error(importMessages.get()[`${fileError}Error`])
    finish('Import failed')
  }
})
