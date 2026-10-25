import { withoutMeta } from '@logux/client/db'
import { SUBPROTOCOL } from '@slowreader/api'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addCategory,
  addFeed,
  addFilter,
  addPost,
  busy,
  cacheImages,
  deleteCategory,
  deleteFeed,
  deleteFilter,
  deletePost,
  GENERAL_CATEGORY,
  isDemo,
  loadAccounts,
  loadCategories,
  loadFeeds,
  loadFilters,
  importMessages,
  loadPosts,
  type NewCategory,
  type NewFeed,
  type NewFilter,
  type NewPost,
  setRequestMethod,
  testAccount,
  testFeed,
  testPost,
  theme,
  waitLoading
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  startClient,
  expectRequest,
  mockRequest,
  openPage,
  setupNodeDom
} from '../utils.ts'

setupNodeDom()

describe('import page', () => {
  let MIME_TYPES = {
    json: 'application/json',
    opml: 'application/xml',
    txt: 'text/plain',
    xml: 'application/xml'
  }

  let CATEGORY = { id: 'c1', title: 'A' } satisfies NewCategory
  let FEED = {
    categoryId: CATEGORY.id,
    id: 'f1',
    loader: 'atom',
    reading: 'slow',
    title: 'F1',
    url: 'https://example.com/feed'
  } satisfies NewFeed
  let FILTER = {
    action: 'fast',
    feedId: FEED.id,
    id: 'filter1',
    priority: 1,
    query: 'include(text)'
  } satisfies NewFilter
  let POST = {
    feedId: FEED.id,
    id: 'p1',
    originId: 'test-1',
    publishedAt: 1000,
    reading: 'fast',
    sortedAt: 1000,
    title: 'Post 1'
  } satisfies NewPost

  function file(format: keyof typeof MIME_TYPES, content: string): File {
    return new File([content], `feeds.${format}`, {
      type: MIME_TYPES[format]
    })
  }

  let exportedBlob: Blob | undefined

  beforeEach(() => {
    exportedBlob = undefined
    startClient({
      saveFile(filename, content) {
        exportedBlob = content
      }
    })
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  test('imports state JSON', async () => {
    await addCategory(CATEGORY)
    await addFeed(FEED)
    await addFilter(FILTER)
    await addPost(POST)
    theme.set('light')
    cacheImages.set('never')

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportBackup()
    await waitLoading(exportPage.exportingBackup)
    if (!exportedBlob) {
      throw new Error('Failed to export state')
    }
    await deletePost(POST.id)
    await deleteFilter(FILTER.id)
    await deleteFeed(FEED.id)
    await deleteCategory(CATEGORY.id)
    theme.set('system')
    cacheImages.set('always')

    let page = openPage({
      params: {},
      route: 'import'
    })
    equal(busy.get(), false)
    equal(page.fileError.get(), false)
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), false)

    page.importFile(file('json', await exportedBlob.text()))
    deepEqual(busy.get(), {
      blocking: true,
      label: importMessages.get().importing,
      progress: undefined
    })
    await waitLoading(busy)
    await setTimeout(100)
    equal(page.fileError.get(), false)
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), 1)
    equal(theme.get(), 'light')
    equal(cacheImages.get(), 'always')
    deepEqual(withoutMeta(await loadCategories()), [
      { ...CATEGORY, fastReader: null, slowReader: null }
    ])
    deepEqual(withoutMeta(await loadFeeds()), [
      {
        ...FEED,
        accountId: null,
        avatar: null,
        fastReader: null,
        lastOriginId: null,
        lastPublishedAt: null,
        loaderData: null,
        originTitle: null,
        refreshedAt: null,
        slowReader: null
      }
    ])
    deepEqual(withoutMeta(await loadFilters()), [FILTER])
    deepEqual(withoutMeta(await loadPosts()), [
      {
        ...POST,
        accountId: null,
        author: null,
        full: null,
        intro: null,
        lang: null,
        media: null,
        mediaSizes: null,
        merged: false,
        preview: null,
        quoted: null,
        read: false,
        replied: null,
        repostedBy: null,
        threadId: null,
        unsupported: null,
        updatedAt: null,
        url: null,
        warning: null
      }
    ])
  })

  test('imports accounts', async () => {
    let signedIn = await addAccount(
      testAccount({ handle: '@me@mastodon.social', id: 'current' })
    )
    let backup = {
      accounts: withoutMeta([
        testAccount({ handle: '@me@mastodon.social', id: 'a1' }),
        testAccount({ handle: '@work@mastodon.social', id: 'a2' })
      ]),
      categories: [],
      feeds: withoutMeta([testFeed({ accountId: 'a1', id: 'virtual' })]),
      filters: [],
      posts: withoutMeta([
        testPost({ accountId: 'a2', feedId: null, id: 'p1' }),
        testPost({ feedId: 'virtual', id: 'p2' })
      ]),
      settings: { preloadImages: 'always', theme: 'system' },
      subprotocol: SUBPROTOCOL
    }
    let page = openPage({ params: {}, route: 'import' })
    page.importFile(file('json', JSON.stringify(backup)))
    await waitLoading(busy)
    await setTimeout(100)
    equal(page.fileError.get(), false)

    deepEqual(
      (await loadAccounts()).map(i => [i.id, i.handle]),
      [
        [signedIn, '@me@mastodon.social'],
        ['a2', '@work@mastodon.social']
      ]
    )
    deepEqual(
      (await loadFeeds()).map(i => [i.id, i.accountId]),
      [['virtual', signedIn]]
    )
    deepEqual(
      (await loadPosts()).map(i => [i.id, i.feedId, i.accountId]),
      [
        ['p1', null, 'a2'],
        ['p2', 'virtual', null]
      ]
    )
  })

  test('imports OPML from the app', async () => {
    let FEED2 = testFeed({ url: 'https://a.com/atom' })
    await addCategory(CATEGORY)
    await addFeed(FEED)
    await addFeed(FEED2)
    let feed3 = await addFeed(testFeed({ url: 'https://broken.com/' }))
    let feed4 = await addFeed(testFeed({ url: 'https://unknown.com/' }))

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportOpml()
    await waitLoading(exportPage.exportingOpml)
    if (!exportedBlob) {
      throw new Error('Failed to export OPML')
    }
    await deleteFeed(FEED.id)
    await deleteFeed(FEED2.id)
    await deleteFeed(feed3)
    await deleteFeed(feed4)
    await deleteCategory(CATEGORY.id)

    let page = openPage({
      params: {},
      route: 'import'
    })
    expectRequest(FEED2.url).andRespond(200, '<feed></feed>')
    expectRequest('https://broken.com/').andRespond(404)
    expectRequest('https://unknown.com/').andRespond(200, '<html></html>')
    expectRequest(
      'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile' +
        '?actor=unknown.com'
    ).andRespond(400)
    expectRequest(FEED.url).andRespond(200, '<rss></rss>')
    page.importFile(file('opml', await exportedBlob.text()))
    await waitLoading(busy)
    equal(page.fileError.get(), false)
    deepEqual(page.feedErrors.get(), [
      ['https://broken.com/', 'unloadable'],
      ['https://unknown.com/', 'unknown']
    ])
    equal(page.done.get(), 2)

    let categories = await loadCategories()
    deepEqual(
      categories.map(i => i.title),
      ['A']
    )
    deepEqual(
      (await loadFeeds()).map(i => ({
        categoryId: i.categoryId,
        loader: i.loader,
        title: i.title
      })),
      [
        { categoryId: categories[0]?.id, loader: 'rss', title: FEED.title },
        { categoryId: GENERAL_CATEGORY, loader: 'atom', title: FEED2.title }
      ]
    )
  })

  test('replaces the demo feeds', async () => {
    let DEMO_FEED = testFeed({ title: 'Demo', url: 'https://demo.com/feed' })
    await addCategory(CATEGORY)
    await addFeed(FEED)

    let exportPage = openPage({ params: {}, route: 'export' })
    exportPage.exportOpml()
    await waitLoading(exportPage.exportingOpml)
    if (!exportedBlob) {
      throw new Error('Failed to export OPML')
    }
    await deleteFeed(FEED.id)
    await deleteCategory(CATEGORY.id)
    await addFeed(DEMO_FEED)
    isDemo.set(true)

    let page = openPage({ params: {}, route: 'import' })
    expectRequest(FEED.url).andRespond(200, '<rss></rss>')
    page.importFile(file('opml', await exportedBlob.text()))
    await waitLoading(busy)

    equal(isDemo.get(), false)
    equal(page.done.get(), 1)
    deepEqual(
      (await loadFeeds()).map(i => i.title),
      [FEED.title]
    )
  })

  test('is ready for unknown files', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(file('txt', ''))
    await waitLoading(busy)
    equal(page.fileError.get(), 'unknownFormat')
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), false)
  })

  test('is ready for broken JSON', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(file('json', '{'))
    await waitLoading(busy)
    equal(page.fileError.get(), 'brokenFile')
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), false)
  })

  test('is ready for broken XML', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(file('opml', '<'))
    await waitLoading(busy)
    equal(page.fileError.get(), 'brokenFile')
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), false)
  })

  test('is ready for unknown XML', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(file('opml', '<html></html>'))
    await waitLoading(busy)
    equal(page.fileError.get(), 'brokenFile')
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), false)
  })

  test('is ready for OPML without feeds', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    let emptyOpml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<opml version="2.0"><body></body></opml>'
    page.importFile(file('opml', emptyOpml))
    await waitLoading(busy)
    equal(page.fileError.get(), 'noFeeds')
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), false)
  })

  test('tracks done count after state JSON import', async () => {
    let FEED2 = testFeed({ url: 'https://a.com/atom' })
    await addCategory(CATEGORY)
    await addFeed(FEED)
    await addFeed(FEED2)

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportBackup()
    await waitLoading(exportPage.exportingBackup)
    if (!exportedBlob) {
      throw new Error('Failed to export state')
    }
    await deleteFeed(FEED.id)
    await deleteFeed(FEED2.id)
    await deleteCategory(CATEGORY.id)

    let page = openPage({
      params: {},
      route: 'import'
    })
    equal(page.done.get(), false)
    page.importFile(file('json', await exportedBlob.text()))
    await waitLoading(busy)
    equal(page.done.get(), 2)
  })

  test('tracks done count after OPML import', async () => {
    let FEED2 = testFeed({ url: 'https://a.com/atom' })
    await addCategory(CATEGORY)
    await addFeed(FEED)
    await addFeed(FEED2)

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportOpml()
    await waitLoading(exportPage.exportingOpml)
    if (!exportedBlob) {
      throw new Error('Failed to export OPML')
    }
    await deleteFeed(FEED.id)
    await deleteFeed(FEED2.id)
    await deleteCategory(CATEGORY.id)

    let page = openPage({
      params: {},
      route: 'import'
    })
    equal(page.done.get(), false)
    expectRequest(FEED2.url).andRespond(200, '<feed></feed>')
    expectRequest(FEED.url).andRespond(200, '<rss></rss>')
    page.importFile(file('opml', await exportedBlob.text()))
    await waitLoading(busy)
    equal(page.done.get(), 2)
  })

  test('done count is zero for failed import', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    equal(page.done.get(), false)
    page.importFile(file('json', '{'))
    await waitLoading(busy)
    equal(page.done.get(), false)
    equal(page.fileError.get(), 'brokenFile')
  })

  test('done is set to zero when import succeeds with no feeds', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    equal(page.done.get(), false)
    let emptyJson = JSON.stringify({
      accounts: [],
      categories: [],
      feeds: [],
      filters: [],
      posts: [],
      settings: { preloadImages: 'always', theme: 'system' },
      subprotocol: SUBPROTOCOL
    })
    page.importFile(file('json', emptyJson))
    await waitLoading(busy)
    equal(page.done.get(), 0)
    equal(page.fileError.get(), false)
    deepEqual(page.feedErrors.get(), [])
  })

  test('rejects backups from other versions', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    let backup = {
      accounts: [],
      categories: [],
      feeds: [{ ...FEED, title: 'Old' }],
      filters: [],
      posts: [],
      settings: { preloadImages: 'always', theme: 'system' }
    }

    page.importFile(file('json', JSON.stringify(backup)))
    await waitLoading(busy)
    equal(page.fileError.get(), 'oldBackup')
    equal(page.done.get(), false)

    page.importFile(
      file('json', JSON.stringify({ ...backup, subprotocol: SUBPROTOCOL - 1 }))
    )
    await waitLoading(busy)
    equal(page.fileError.get(), 'oldBackup')

    page.importFile(
      file('json', JSON.stringify({ ...backup, subprotocol: SUBPROTOCOL + 1 }))
    )
    await waitLoading(busy)
    equal(page.fileError.get(), 'newBackup')
    equal(page.done.get(), false)
    deepEqual(await loadFeeds(), [])
  })

  test('prevents importing duplicate feeds from OPML', async () => {
    let FEED2 = testFeed({ url: 'https://a.com/atom' })
    await addCategory(CATEGORY)
    await addFeed(FEED)
    await addFeed(FEED2)

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportOpml()
    await waitLoading(exportPage.exportingOpml)
    if (!exportedBlob) {
      throw new Error('Failed to export OPML')
    }

    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(file('opml', await exportedBlob.text()))
    await waitLoading(busy)
    equal(page.fileError.get(), false)
    deepEqual(page.feedErrors.get(), [
      [FEED2.url, 'exists'],
      [FEED.url, 'exists']
    ])
    equal(page.done.get(), 0)
  })

  test('imports OPML with special characters in titles and URLs', async () => {
    let url = 'https://example.com/feed?a=1&b=2'
    await addCategory({ id: 'c2', title: 'A & B' })
    await addFeed(
      testFeed({ categoryId: 'c2', title: 'Tom & <Jerry> "Show"', url })
    )

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportOpml()
    await waitLoading(exportPage.exportingOpml)
    if (!exportedBlob) {
      throw new Error('Failed to export OPML')
    }
    await deleteFeed((await loadFeeds())[0]!.id)
    await deleteCategory('c2')

    let page = openPage({
      params: {},
      route: 'import'
    })
    expectRequest(url).andRespond(200, '<rss></rss>')
    page.importFile(file('opml', await exportedBlob.text()))
    await waitLoading(busy)
    equal(page.fileError.get(), false)
    equal(page.done.get(), 1)
    deepEqual(
      (await loadCategories()).map(i => i.title),
      ['A & B']
    )
    deepEqual(
      (await loadFeeds()).map(i => [i.title, i.url]),
      [['Tom & <Jerry> "Show"', url]]
    )
  })

  test('does not import the part of OPML parsed before the error', async () => {
    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(
      file(
        'opml',
        '<opml version="2.0"><body>' +
          `<outline text="F1" type="rss" xmlUrl="${FEED.url}" />` +
          '<parsererror>Broken</parsererror>' +
          '</body></opml>'
      )
    )
    await waitLoading(busy)
    equal(page.fileError.get(), 'brokenFile')
    equal(page.done.get(), false)
    deepEqual(await loadFeeds(), [])
  })

  test('reuses categories when the same OPML is imported twice', async () => {
    let opml =
      '<opml version="2.0"><body>' +
      '<outline text="A">' +
      `<outline text="F1" type="rss" xmlUrl="${FEED.url}" />` +
      '</outline></body></opml>'

    let page = openPage({
      params: {},
      route: 'import'
    })
    expectRequest(FEED.url).andRespond(200, '<rss></rss>')
    page.importFile(file('opml', opml))
    await waitLoading(busy)
    equal(page.done.get(), 1)
    deepEqual(
      (await loadCategories()).map(i => i.title),
      ['A']
    )

    page.importFile(file('opml', opml))
    await waitLoading(busy)
    equal(page.done.get(), 0)
    deepEqual(page.feedErrors.get(), [[FEED.url, 'exists']])
    deepEqual(
      (await loadCategories()).map(i => i.title),
      ['A']
    )
    equal((await loadFeeds()).length, 1)
  })

  test('finds the feed moved by a redirect', async () => {
    let opml =
      '<opml version="2.0"><body>' +
      `<outline text="F1" type="rss" xmlUrl="${FEED.url}" />` +
      '</body></opml>'
    setRequestMethod(() => {
      let response = new Response('<rss></rss>', {
        headers: { 'Content-Type': 'application/xml' },
        status: 200
      })
      Object.defineProperty(response, 'url', {
        value: 'https://example.com/rss'
      })
      return Promise.resolve(response)
    })

    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(file('opml', opml))
    await waitLoading(busy)
    equal(page.done.get(), 1)
    deepEqual(
      (await loadFeeds()).map(i => i.url),
      ['https://example.com/rss']
    )

    page.importFile(file('opml', opml))
    await waitLoading(busy)
    equal(page.done.get(), 0)
    deepEqual(page.feedErrors.get(), [[FEED.url, 'exists']])
    equal((await loadFeeds()).length, 1)
  })

  test('prefers HTTPS when importing HTTP feeds', async () => {
    let url = 'http://example.com/feed?a=1&b=2'
    let secure = 'https://example.com/feed?a=1&b=2'
    let opml =
      '<opml version="2.0"><body><outline text="A">' +
      '<outline text="Imported" xmlUrl="http://example.com/feed?a=1&amp;b=2" />' +
      '<outline text="Duplicate" xmlUrl="https://example.com/feed?a=1&amp;b=2" />' +
      '</outline></body></opml>'
    let response =
      '<rss><channel><title>Secure</title><item>' +
      '<guid>post-1</guid><title>Secure post</title>' +
      '<link>https://example.com/post-1</link>' +
      '</item></channel></rss>'
    let requests: string[] = []
    setRequestMethod(address => {
      requests.push(address)
      let answer = new Response(response)
      Object.defineProperty(answer, 'url', { value: address })
      return Promise.resolve(answer)
    })
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(file('opml', opml))

    deepEqual(requests, [secure])
    equal(page.fileError.get(), false)
    equal(page.done.get(), 1)
    equal(page.lastAdded.get(), secure)
    deepEqual(page.feedErrors.get(), [[secure, 'exists']])
    let categories = await loadCategories()
    deepEqual(
      categories.map(i => i.title),
      ['A']
    )
    deepEqual(
      (await loadFeeds()).map(i => [i.url, i.loader, i.title, i.categoryId]),
      [[secure, 'rss', 'Imported', categories[0]?.id]]
    )
    deepEqual(
      (await loadPosts()).map(i => i.title),
      ['Secure post']
    )

    await page.importFile(file('opml', opml))
    equal(page.done.get(), 0)
    deepEqual(page.feedErrors.get(), [
      [url, 'exists'],
      [secure, 'exists']
    ])
    equal((await loadFeeds()).length, 1)
    equal((await loadCategories()).length, 1)
    deepEqual(requests, [secure])
  })

  test('upgrades HTTP feeds for every feed format', async () => {
    let responses: [string, string][] = [
      ['atom', '<feed><title>Atom</title></feed>'],
      [
        'jsonFeed',
        '{"version":"https://jsonfeed.org/version/1","title":"JSON","items":[]}'
      ],
      [
        'rss1',
        '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" ' +
          'xmlns="http://purl.org/rss/1.0/"><channel><title>RSS</title></channel></rdf:RDF>'
      ]
    ]
    let opml = '<opml version="2.0"><body>'
    for (let [loader, response] of responses) {
      opml += `<outline xmlUrl="http://example.com/${loader}" />`
      expectRequest(`https://example.com/${loader}`).andRespond(
        200,
        response,
        loader === 'jsonFeed' ? 'application/feed+json' : 'application/xml'
      )
    }
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(file('opml', opml + '</body></opml>'))

    equal(page.done.get(), 3)
    deepEqual(page.feedErrors.get(), [])
    deepEqual(
      (await loadFeeds()).map(i => [i.url, i.loader]),
      responses.map(([loader]) => [`https://example.com/${loader}`, loader])
    )
  })

  test('normalizes HTTP URLs before checking HTTPS', async () => {
    let page = openPage({ params: {}, route: 'import' })
    for (let [url, secure] of [
      ['http://example.com:80/feed', 'https://example.com/feed'],
      [
        'HTTP://EXAMPLE.com:80/feed?a=1&b=2',
        'https://example.com/feed?a=1&b=2'
      ],
      ['http://example.com:8080/feed', 'https://example.com:8080/feed'],
      ['  http://example.com:80/spaced  ', 'https://example.com/spaced']
    ]) {
      expectRequest(secure!).andRespond(200, '<rss></rss>')
      await page.importFile(
        file(
          'opml',
          '<opml><body><outline xmlUrl="' +
            url!.replaceAll('&', '&amp;') +
            '" /></body></opml>'
        )
      )
      equal(page.done.get(), 1)
      equal(page.lastAdded.get(), secure)
      deepEqual(page.feedErrors.get(), [])
    }
    equal((await loadFeeds()).length, 4)
  })

  test('skips existing HTTPS feeds for an HTTP URL with its default port', async () => {
    await addFeed(testFeed({ url: 'https://example.com/feed' }))
    let requests: string[] = []
    setRequestMethod(url => {
      requests.push(url)
      return Promise.reject(new Error('Unexpected request'))
    })
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(
      file(
        'opml',
        '<opml><body><outline text="Empty">' +
          '<outline xmlUrl="http://example.com:80/feed" />' +
          '</outline></body></opml>'
      )
    )

    equal(page.done.get(), 0)
    deepEqual(page.feedErrors.get(), [['http://example.com:80/feed', 'exists']])
    equal((await loadFeeds()).length, 1)
    deepEqual(await loadCategories(), [])
    deepEqual(requests, [])
  })

  test('falls back to HTTP when HTTPS is unavailable or not a feed', async () => {
    let opml = '<opml version="2.0"><body>'
    for (let name of ['missing', 'server', 'network', 'html', 'xml', 'json']) {
      opml += `<outline xmlUrl="http://example.com/${name}" />`
      let request = expectRequest(`https://example.com/${name}`)
      if (name === 'missing') {
        request.andRespond(404)
      } else if (name === 'server') {
        request.andRespond(503)
      } else if (name === 'network') {
        request.andFail()
      } else if (name === 'html') {
        request.andRespond(200, '<html></html>')
      } else if (name === 'xml') {
        request.andRespond(200, '<rss><', 'application/xml')
      } else {
        request.andRespond(200, '{', 'application/json')
      }
      expectRequest(`http://example.com/${name}`).andRespond(200, '<rss></rss>')
    }
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(file('opml', opml + '</body></opml>'))

    equal(page.done.get(), 6)
    equal(page.fileError.get(), false)
    deepEqual(page.feedErrors.get(), [])
    deepEqual(
      (await loadFeeds()).map(i => i.url),
      ['missing', 'server', 'network', 'html', 'xml', 'json'].map(
        name => `http://example.com/${name}`
      )
    )
  })

  test('keeps HTTP import errors after a failed HTTPS check', async () => {
    let opml =
      '<opml version="2.0"><body><outline text="Empty">' +
      '<outline xmlUrl="http://example.com/missing" />' +
      '<outline xmlUrl="http://example.com/unknown" />' +
      '<outline xmlUrl="http://[" />' +
      '</outline><outline xmlUrl="https://example.com/working" /></body></opml>'
    expectRequest('https://example.com/missing').andRespond(404)
    expectRequest('http://example.com/missing').andRespond(404)
    expectRequest('https://example.com/unknown').andRespond(
      200,
      '<html></html>'
    )
    expectRequest('http://example.com/unknown').andRespond(200, '<html></html>')
    expectRequest('http://[').andRespond(404)
    expectRequest('https://example.com/working').andRespond(200, '<rss></rss>')
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(file('opml', opml))

    equal(page.done.get(), 1)
    deepEqual(page.feedErrors.get(), [
      ['http://example.com/missing', 'unloadable'],
      ['http://example.com/unknown', 'unknown'],
      ['http://[', 'unloadable']
    ])
    deepEqual(await loadCategories(), [])
    deepEqual(
      (await loadFeeds()).map(i => i.url),
      ['https://example.com/working']
    )
  })

  test('uses the final URL of an HTTPS check for duplicate detection', async () => {
    let opml =
      '<opml version="2.0"><body>' +
      '<outline xmlUrl="http://example.com/old" />' +
      '</body></opml>'
    let requests: string[] = []
    setRequestMethod(url => {
      requests.push(url)
      let response = new Response('<rss></rss>')
      Object.defineProperty(response, 'url', {
        value: 'https://example.com/new'
      })
      return Promise.resolve(response)
    })
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(file('opml', opml))
    equal(page.done.get(), 1)
    equal(page.lastAdded.get(), 'https://example.com/new')
    deepEqual(
      (await loadFeeds()).map(i => i.url),
      ['https://example.com/new']
    )

    await page.importFile(file('opml', opml))
    equal(page.done.get(), 0)
    deepEqual(page.feedErrors.get(), [['http://example.com/old', 'exists']])
    equal((await loadFeeds()).length, 1)
    deepEqual(requests, ['https://example.com/old', 'https://example.com/old'])
  })

  test('keeps the final HTTP URL when HTTPS redirects back to HTTP', async () => {
    let url = 'http://example.com/feed'
    let requests: string[] = []
    setRequestMethod(address => {
      requests.push(address)
      let response = new Response('<rss></rss>')
      Object.defineProperty(response, 'url', { value: url })
      return Promise.resolve(response)
    })
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(
      file('opml', `<opml><body><outline xmlUrl="${url}" /></body></opml>`)
    )

    equal(page.done.get(), 1)
    deepEqual(
      (await loadFeeds()).map(i => i.url),
      [url]
    )
    deepEqual(requests, ['https://example.com/feed'])
  })

  test('falls back to HTTP when the HTTPS check times out', async context => {
    let timeout = globalThis.setTimeout
    context.mock.method(
      globalThis,
      'setTimeout',
      (
        callback: (...args: unknown[]) => void,
        ms?: number,
        ...args: unknown[]
      ) => timeout(callback, ms === 5000 ? 0 : ms, ...args)
    )
    let reply = expectRequest('https://example.com/feed').andWait()
    expectRequest('http://example.com/feed').andRespond(200, '<rss></rss>')
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(
      file(
        'opml',
        '<opml><body><outline xmlUrl="http://example.com/feed" /></body></opml>'
      )
    )

    equal(reply.aborted, true)
    equal(page.done.get(), 1)
    deepEqual(page.feedErrors.get(), [])
    deepEqual(
      (await loadFeeds()).map(i => i.url),
      ['http://example.com/feed']
    )
  })

  test('skips existing HTTP feeds before checking HTTPS', async () => {
    await addFeed(testFeed({ url: 'http://example.com/feed' }))
    let requests: string[] = []
    setRequestMethod(url => {
      requests.push(url)
      return Promise.reject(new Error('Unexpected request'))
    })
    let page = openPage({ params: {}, route: 'import' })
    for (let url of ['http://example.com/feed', 'http://example.com:80/feed']) {
      await page.importFile(
        file('opml', `<opml><body><outline xmlUrl="${url}" /></body></opml>`)
      )
      equal(page.done.get(), 0)
      deepEqual(page.feedErrors.get(), [[url, 'exists']])
    }
    equal((await loadFeeds()).length, 1)
    deepEqual(requests, [])
  })

  test('skips existing HTTPS feeds before checking an HTTP import', async () => {
    await addFeed(testFeed({ url: 'https://example.com/feed' }))
    let page = openPage({ params: {}, route: 'import' })
    await page.importFile(
      file(
        'opml',
        '<opml><body><outline text="Empty">' +
          '<outline xmlUrl="http://example.com/feed" />' +
          '</outline></body></opml>'
      )
    )

    equal(page.done.get(), 0)
    deepEqual(page.feedErrors.get(), [['http://example.com/feed', 'exists']])
    equal((await loadFeeds()).length, 1)
    deepEqual(await loadCategories(), [])
  })

  test('prevents importing duplicate feeds from state JSON', async () => {
    let FEED2 = testFeed({ url: 'https://a.com/atom' })
    await addCategory(CATEGORY)
    await addFeed(FEED)
    await addFeed(FEED2)

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportBackup()
    await waitLoading(exportPage.exportingBackup)
    if (!exportedBlob) {
      throw new Error('Failed to export state')
    }

    let page = openPage({
      params: {},
      route: 'import'
    })
    page.importFile(file('json', await exportedBlob.text()))
    await waitLoading(busy)
    equal(page.fileError.get(), false)
    deepEqual(page.feedErrors.get(), [])
    equal(page.done.get(), 0)

    equal((await loadFeeds()).length, 2)
  })

  test('imports OPML with .xml extension', async () => {
    await addCategory(CATEGORY)
    await addFeed(FEED)

    let exportPage = openPage({
      params: {},
      route: 'export'
    })
    exportPage.exportOpml()
    await waitLoading(exportPage.exportingOpml)
    if (!exportedBlob) {
      throw new Error('Failed to export OPML')
    }
    await deleteFeed(FEED.id)

    let page = openPage({
      params: {},
      route: 'import'
    })
    expectRequest(FEED.url).andRespond(200, '<rss></rss>')
    let xmlFile = new File([await exportedBlob.text()], 'feeds.xml', {
      type: 'application/xml'
    })
    page.importFile(xmlFile)
    await waitLoading(busy)
    equal(page.fileError.get(), false)
    equal(page.done.get(), 1)

    deepEqual(
      (await loadFeeds()).map(i => ({
        loader: i.loader,
        title: i.title
      })),
      [{ loader: 'rss', title: FEED.title }]
    )
  })
})
