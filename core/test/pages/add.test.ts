import '../dom-parser.ts'

import { keepMount } from 'nanostores'
import { deepStrictEqual, equal, notEqual } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  checkAndRemoveRequestMock,
  expectRequest,
  type FeedLoader,
  loaders,
  mockRequest,
  openedPopups,
  router,
  setIsMobile,
  waitLoading
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  getPopup,
  openPage,
  setBaseTestRoute
} from '../utils.ts'

beforeEach(() => {
  setIsMobile(false)
  enableClientTest({
    warn(e) {
      if (
        typeof e !== 'string' &&
        (e.name === 'MockRequestError' || !/: 500|: 404|DOM/.test(e.message))
      ) {
        throw e
      }
    }
  })
  mockRequest()
})

afterEach(async () => {
  await cleanClientTest()
  checkAndRemoveRequestMock()
  setIsMobile(false)
})

function equalWithText(a: FeedLoader[], b: FeedLoader[]): void {
  equal(a.length, b.length)
  for (let i = 0; i < a.length; i++) {
    let aFix = { ...a[i], text: undefined }
    let bFix = { ...b[i], text: undefined }
    deepStrictEqual(aFix, bFix)
  }
}

test('empty from beginning', () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  equal(page.route, 'add')
  keepMount(page.error)
  keepMount(page.searching)
  keepMount(page.candidates)

  equal(page.error.get(), undefined)
  equal(page.searching.get(), false)
  deepStrictEqual(page.candidates.get(), [])
})

test('validates URL', () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.error)

  page.params.url.set('mailto:user@example.com')
  equal(page.error.get(), 'invalidUrl')

  page.params.url.set('http://a b')
  equal(page.error.get(), 'invalidUrl')

  page.params.url.set('not URL')
  equal(page.error.get(), 'invalidUrl')

  equal(page.noResults.get(), false)
})

test('cleans state', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.error)
  keepMount(page.candidates)

  let reply = expectRequest('https://example.com').andWait()
  page.params.url.set('https://example.com')
  await setTimeout(10)
  openPage({
    params: {},
    route: 'welcome'
  })
  equal(page.error.get(), undefined)
  deepStrictEqual(page.candidates.get(), [])
  equal(reply.aborted, true)

  page.params.url.set('https://other.com')
  equal(page.searching.get(), false)

  let page2 = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page2.error)
  keepMount(page2.candidates)
  notEqual(page2, page)

  page2.params.url.set('not URL')
  openPage({
    params: {},
    route: 'welcome'
  })
  equal(page2.error.get(), undefined)
  deepStrictEqual(page2.candidates.get(), [])
})

test('is ready for network errors', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.searching)
  keepMount(page.error)

  let reply = expectRequest('https://example.com').andWait()
  page.params.url.set('https://example.com')
  equal(page.searching.get(), true)
  equal(page.error.get(), undefined)
  equal(page.noResults.get(), false)

  await reply(404)
  equal(page.searching.get(), false)
  equal(page.error.get(), 'unloadable')
  equal(page.noResults.get(), false)

  page.params.url.set('')
  equal(page.searching.get(), false)
  equal(page.error.get(), undefined)
  equal(page.noResults.get(), false)
})

test('aborts all HTTP requests on URL change', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  let reply1 = expectRequest('https://example.com').andWait()
  page.params.url.set('https://example.com')

  page.params.url.set('')
  await setTimeout(10)
  equal(reply1.aborted, true)

  let reply2 = expectRequest('https://other.com').andWait()
  page.params.url.set('https://other.com')

  openPage({
    params: {},
    route: 'welcome'
  })
  await setTimeout(10)
  equal(reply2.aborted, true)
})

test('detects RSS links', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.searching)
  keepMount(page.error)
  keepMount(page.candidates)

  let loadingChanges: boolean[] = []
  page.searching.subscribe(() => {
    loadingChanges.push(page.searching.get())
  })

  let replyHtml = expectRequest('https://example.com').andWait()
  page.params.url.set('https://example.com')
  equal(page.searching.get(), true)
  equal(page.error.get(), undefined)
  deepStrictEqual(page.candidates.get(), [])
  equal(page.noResults.get(), false)

  let replyRss = expectRequest('https://example.com/news').andWait()
  replyHtml(
    200,
    '<!DOCTYPE html><html><head>' +
      '<link rel="alternate" type="application/rss+xml" href="/news">' +
      '</head></html>'
  )
  await setTimeout(10)
  equal(page.searching.get(), true)
  equal(page.error.get(), undefined)
  deepStrictEqual(page.candidates.get(), [])
  equal(page.noResults.get(), false)

  let rss = '<rss><channel><title> News </title></channel></rss>'
  replyRss(200, rss, 'application/rss+xml')
  await waitLoading(page.searching)
  equal(page.error.get(), undefined)
  deepStrictEqual(loadingChanges, [false, true, false])
  equalWithText(page.candidates.get(), [
    {
      loader: loaders.rss,
      name: 'rss',
      title: 'News',
      url: 'https://example.com/news'
    }
  ])
  equal(page.noResults.get(), false)
})

test('is ready for empty title', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.searching)
  keepMount(page.error)
  keepMount(page.candidates)

  expectRequest('https://example.com').andRespond(
    200,
    `<html>
      <link type="application/atom+xml" href="https://other.com/atom">
    </html>`
  )
  let atom = '<feed><title></title></feed>'
  expectRequest('https://other.com/atom').andRespond(200, atom, 'text/xml')

  page.params.url.set('https://example.com')
  await waitLoading(page.searching)
  equal(page.error.get(), undefined)
  equalWithText(page.candidates.get(), [
    {
      loader: loaders.atom,
      name: 'atom',
      title: '',
      url: 'https://other.com/atom'
    }
  ])
})

test('ignores duplicate links', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.searching)
  keepMount(page.error)
  keepMount(page.candidates)

  expectRequest('https://example.com').andRespond(
    200,
    `<html>
      <link type="application/atom+xml" href="https://other.com/atom">
      <a href="https://other.com/atom">Feed</a>
    </html>`
  )
  let rss = '<feed><title>Feed</title></feed>'
  expectRequest('https://other.com/atom').andRespond(200, rss, 'text/xml')

  page.params.url.set('https://example.com')
  await waitLoading(page.searching)
  equal(page.error.get(), undefined)
  equalWithText(page.candidates.get(), [
    {
      loader: loaders.atom,
      name: 'atom',
      title: 'Feed',
      url: 'https://other.com/atom'
    }
  ])
})

test('looks for popular RSS, Atom and JsonFeed places', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.searching)
  keepMount(page.error)
  keepMount(page.candidates)

  expectRequest('https://example.com').andRespond(200, '<html>Nothing</html>')
  let atom = '<feed><title></title></feed>'
  expectRequest('https://example.com/feed').andRespond(404)
  expectRequest('https://example.com/atom').andRespond(200, atom, 'text/xml')
  expectRequest('https://example.com/feed.json').andRespond(404)
  expectRequest('https://example.com/rss').andRespond(404)

  page.params.url.set('https://example.com')
  await waitLoading(page.searching)
  equal(page.error.get(), undefined)
  equalWithText(page.candidates.get(), [
    {
      loader: loaders.atom,
      name: 'atom',
      title: '',
      url: 'https://example.com/atom'
    }
  ])
})

test('shows if unknown URL', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.searching)
  keepMount(page.error)
  keepMount(page.candidates)
  keepMount(page.noResults)

  expectRequest('https://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://example.com/feed').andRespond(404)
  expectRequest('https://example.com/atom').andRespond(404)
  expectRequest('https://example.com/feed.json').andRespond(404)
  expectRequest('https://example.com/rss').andRespond(404)

  page.params.url.set('https://example.com')
  await waitLoading(page.searching)
  equal(page.error.get(), undefined)
  deepStrictEqual(page.candidates.get(), [])
  equal(page.noResults.get(), true)
})

test('always keep the same order of candidates', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.candidates)
  expectRequest('https://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://example.com/feed').andRespond(404)
  expectRequest('https://example.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'application/rss+xml'
  )
  expectRequest('https://example.com/feed.json').andRespond(
    200,
    '{ "version": "https://jsonfeed.org/version/1.1", "title": "JsonFeed", "items": [] }',
    'application/json'
  )
  expectRequest('https://example.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  page.params.url.set('https://example.com')
  await waitLoading(page.searching)
  deepStrictEqual(
    page.candidates.get().map(i => i.title),
    ['Atom', 'JsonFeed', 'RSS']
  )

  openPage({
    params: {},
    route: 'welcome'
  })
  page = openPage({
    params: {},
    route: 'add'
  })
  expectRequest('https://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://example.com/feed').andRespond(404)
  let atom = expectRequest('https://example.com/atom').andWait()
  let jsonFeed = expectRequest('https://example.com/feed.json').andWait()
  expectRequest('https://example.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  page.params.url.set('https://example.com')
  await setTimeout(10)
  atom(200, '<feed><title>Atom</title></feed>', 'application/rss+xml')
  jsonFeed(
    200,
    '{ "version": "https://jsonfeed.org/version/1.1", "title": "JsonFeed", "items": [] }',
    'application/json'
  )

  await waitLoading(page.searching)
  deepStrictEqual(
    page.candidates.get().map(i => i.title),
    ['Atom', 'JsonFeed', 'RSS']
  )
})

test('changes URL during typing in the field', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  equal(page.params.url.get(), undefined)

  page.params.url.set('')
  equal(page.params.url.get(), '')

  expectRequest('https://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://example.com/feed').andRespond(404)
  expectRequest('https://example.com/atom').andRespond(404)
  expectRequest('https://example.com/feed.json').andRespond(404)
  expectRequest('https://example.com/rss').andRespond(404)
  page.params.url.set('example.com')
  equal(page.params.url.get(), 'https://example.com')
  await setTimeout(10)

  page.inputUrl('other')
  equal(page.params.url.get(), 'https://example.com')

  page.inputUrl('other.')
  equal(page.params.url.get(), 'https://example.com')

  expectRequest('https://other.net').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://other.net/feed').andRespond(404)
  expectRequest('https://other.net/atom').andRespond(404)
  expectRequest('https://other.net/feed.json').andRespond(404)
  expectRequest('https://other.net/rss').andRespond(404)
  page.inputUrl('other.net')
  await setTimeout(500)
  equal(page.params.url.get(), 'https://other.net')

  expectRequest('https://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://example.com/feed').andRespond(404)
  expectRequest('https://example.com/atom').andRespond(404)
  expectRequest('https://example.com/feed.json').andRespond(404)
  expectRequest('https://example.com/rss').andRespond(404)
  page.inputUrl('other.net/some')
  page.params.url.set('example.com')
  await setTimeout(500)
  equal(page.params.url.get(), 'https://example.com')

  page.inputUrl('')
  await setTimeout(500)
  equal(page.params.url.get(), undefined)
})

test('starts from HTTPS and then try HTTP', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })
  keepMount(page.searching)
  keepMount(page.error)
  keepMount(page.candidates)

  expectRequest('https://example.com/feed').andRespond(500)
  expectRequest('http://example.com/feed').andRespond(
    200,
    '<feed><title></title></feed>'
  )
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  page.params.url.set('example.com/feed')
  await waitLoading(page.searching)
  equal(page.searching.get(), false)
  equal(page.error.get(), undefined)
  equalWithText(page.candidates.get(), [
    {
      loader: loaders.atom,
      name: 'atom',
      title: '',
      url: 'http://example.com/feed'
    }
  ])

  expectRequest('https://example.com/feed').andRespond(500)
  page.params.url.set('https://example.com/feed')
  await waitLoading(page.searching)
  equal(page.searching.get(), false)
  equal(page.error.get(), 'unloadable')
})

test('syncs feed URL with app URL', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })

  expectRequest('https://a.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://a.com/feed').andRespond(404)
  expectRequest('https://a.com/atom').andRespond(404)
  expectRequest('https://a.com/feed.json').andRespond(404)
  expectRequest('https://a.com/rss').andRespond(404)
  page.params.url.set('https://a.com')
  equal(page.params.url.get(), 'https://a.com')
  deepStrictEqual(router.get().params, {
    url: 'https://a.com'
  })
  await waitLoading(page.searching)

  expectRequest('https://b.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://b.com/feed').andRespond(404)
  expectRequest('https://b.com/atom').andRespond(404)
  expectRequest('https://b.com/feed.json').andRespond(404)
  expectRequest('https://b.com/rss').andRespond(404)
  setBaseTestRoute({
    params: {
      candidate: undefined,
      url: 'https://b.com'
    },
    route: 'add'
  })
  equal(page.params.url.get(), 'https://b.com')
  await waitLoading(page.searching)
})

test('opens first candidate', async () => {
  let page = openPage({
    params: {},
    route: 'add'
  })

  expectRequest('https://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://example.com/feed').andRespond(404)
  expectRequest('https://example.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'application/rss+xml'
  )
  expectRequest('https://example.com/feed.json').andRespond(404)
  expectRequest('https://example.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  page.params.url.set('https://example.com')
  await waitLoading(page.searching)

  equal(openedPopups.get().length, 1)
  let popup = getPopup('feedUrl')
  await setTimeout(1)
  equal(popup.param, 'https://example.com/atom')
  equal(popup.loading.get(), false)
  equal(popup.notFound, false)

  page.params.url.set('')
  equal(openedPopups.get().length, 0)

  setIsMobile(true)
  expectRequest('https://other.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('https://other.com/feed').andRespond(404)
  expectRequest('https://other.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'application/rss+xml'
  )
  expectRequest('https://other.com/feed.json').andRespond(404)
  expectRequest('https://other.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  page.params.url.set('https://other.com')
  await waitLoading(page.searching)
  equal(openedPopups.get().length, 0)
})
