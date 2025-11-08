import {
  importMessages,
  pages,
  setRequestMethod,
  waitLoading
} from '@slowreader/core'
import { createProxy, DEFAULT_PROXY_CONFIG } from '@slowreader/proxy'
import { createServer } from 'node:http'

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
  let opmlFile: string | undefined
  let proxy = true
  for (let arg of args) {
    if (arg === '--no-proxy') {
      proxy = false
    } else if (!opmlFile) {
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

  enableTestClient('import')

  let server: ReturnType<typeof createServer> | undefined
  if (proxy) {
    let proxyHandler = createProxy({
      ...DEFAULT_PROXY_CONFIG,
      allowsFrom: 'localhost'
    })
    server = createServer(proxyHandler)
    server.listen(8001)

    setRequestMethod(async (url, opts = {}) => {
      let originUrl = url
      let nextUrl = 'http://localhost:8001/' + encodeURIComponent(url)
      let headers = opts.headers as object | undefined
      let response = await fetch(nextUrl, {
        headers: {
          Origin: 'http://localhost:8000',
          ...(headers ?? {})
        },
        ...opts
      })
      Object.defineProperty(response, 'url', {
        value: originUrl
      })
      return response
    })
  }

  let page = pages.import()
  let content = await readText(opmlFile)
  let file = new File([content], opmlFile, { type: 'application/xml' })

  function checkDone(): void {
    let done = page.done.get()
    if (done !== false) {
      finish(`${done} ${done === 1 ? 'feed' : 'feeds'} tested successfully`)
      if (server) server.close()
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
    if (server) server.close()
  }
})
