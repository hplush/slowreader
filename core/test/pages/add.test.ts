import '../dom-parser.ts'

import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  checkAndRemoveRequestMock,
  expectRequest,
  type FeedLoader,
  loaders,
  mockRequest,
  pages,
  setBaseTestRoute
} from '../../index.ts'
import { cleanClientTest, enableClientTest } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
  mockRequest()
  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
})

afterEach(async () => {
  await cleanClientTest()
  restoreAll()
  pages.add().exit()
  checkAndRemoveRequestMock()
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
  keepMount(pages.add().error)
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().sortedCandidates)

  equal(pages.add().error.get(), undefined)
  equal(pages.add().candidatesLoading.get(), false)
  deepStrictEqual(pages.add().sortedCandidates.get(), [])
})

test('validates URL', () => {
  keepMount(pages.add().error)

  pages.add().setUrl('mailto:user@example.com')
  equal(pages.add().error.get(), 'invalidUrl')

  pages.add().setUrl('http://a b')
  equal(pages.add().error.get(), 'invalidUrl')

  pages.add().setUrl('not URL')
  equal(pages.add().error.get(), 'invalidUrl')

  equal(pages.add().noResults.get(), false)
})

test('uses HTTPS for specific domains', async () => {
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().sortedCandidates)
  spyOn(loaders.rss, 'getMineLinksFromText', () => [])
  spyOn(loaders.atom, 'getMineLinksFromText', () => [])
  spyOn(loaders.jsonFeed, 'getMineLinksFromText', () => [])
  spyOn(loaders.rss, 'getSuggestedLinksFromText', () => [])
  spyOn(loaders.atom, 'getSuggestedLinksFromText', () => [])
  spyOn(loaders.jsonFeed, 'getSuggestedLinksFromText', () => [])

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  await pages.add().setUrl('twitter.com/blog')

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  await pages.add().setUrl('http://twitter.com/blog')
})

test('cleans state', async () => {
  keepMount(pages.add().error)
  keepMount(pages.add().sortedCandidates)

  let reply = expectRequest('http://example.com').andWait()
  pages.add().setUrl('example.com')
  await setTimeout(10)

  pages.add().exit()
  equal(pages.add().error.get(), undefined)
  deepStrictEqual(pages.add().sortedCandidates.get(), [])
  equal(reply.aborted, true)

  pages.add().setUrl('not URL')

  pages.add().exit()
  equal(pages.add().error.get(), undefined)
  deepStrictEqual(pages.add().sortedCandidates.get(), [])
})

test('is ready for network errors', async () => {
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().error)

  let reply = expectRequest('http://example.com').andWait()
  pages.add().setUrl('example.com')

  equal(pages.add().candidatesLoading.get(), true)
  equal(pages.add().error.get(), undefined)
  equal(pages.add().noResults.get(), false)

  await reply(404)
  equal(pages.add().candidatesLoading.get(), false)
  equal(pages.add().error.get(), 'unloadable')
  equal(pages.add().noResults.get(), false)

  pages.add().setUrl('')
  equal(pages.add().candidatesLoading.get(), false)
  equal(pages.add().error.get(), undefined)
  equal(pages.add().noResults.get(), false)
})

test('aborts all HTTP requests on URL change', async () => {
  let reply1 = expectRequest('http://example.com').andWait()
  pages.add().setUrl('example.com')

  pages.add().setUrl('')
  await setTimeout(10)
  equal(reply1.aborted, true)

  let reply2 = expectRequest('http://other.com').andWait()
  pages.add().setUrl('other.com')

  pages.add().exit()
  await setTimeout(10)
  equal(reply2.aborted, true)
})

test('detects RSS links', async () => {
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().error)
  keepMount(pages.add().sortedCandidates)

  let loadingChanges: boolean[] = []
  pages.add().candidatesLoading.subscribe(() => {
    loadingChanges.push(pages.add().candidatesLoading.get())
  })

  let replyHtml = expectRequest('http://example.com').andWait()
  pages.add().setUrl('example.com')
  await setTimeout(10)
  equal(pages.add().candidatesLoading.get(), true)
  equal(pages.add().error.get(), undefined)
  deepStrictEqual(pages.add().sortedCandidates.get(), [])
  equal(pages.add().noResults.get(), false)

  let replyRss = expectRequest('http://example.com/news').andWait()
  replyHtml(
    200,
    '<!DOCTYPE html><html><head>' +
      '<link rel="alternate" type="application/rss+xml" href="/news">' +
      '</head></html>'
  )
  await setTimeout(10)
  equal(pages.add().candidatesLoading.get(), true)
  equal(pages.add().error.get(), undefined)
  deepStrictEqual(pages.add().sortedCandidates.get(), [])
  equal(pages.add().noResults.get(), false)

  let rss = '<rss><channel><title> News </title></channel></rss>'
  replyRss(200, rss, 'application/rss+xml')
  await setTimeout(10)
  equal(pages.add().candidatesLoading.get(), false)
  equal(pages.add().error.get(), undefined)
  deepStrictEqual(loadingChanges, [false, true, false])
  equalWithText(pages.add().sortedCandidates.get(), [
    {
      loader: loaders.rss,
      name: 'rss',
      title: 'News',
      url: 'http://example.com/news'
    }
  ])
  equal(pages.add().noResults.get(), false)
})

test('is ready for empty title', async () => {
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().error)
  keepMount(pages.add().sortedCandidates)

  expectRequest('http://example.com').andRespond(
    200,
    `<html>
      <link type="application/atom+xml" href="http://other.com/atom">
    </html>`
  )
  let rss = '<feed><title></title></feed>'
  expectRequest('http://other.com/atom').andRespond(200, rss, 'text/xml')

  await pages.add().setUrl('example.com')
  equal(pages.add().candidatesLoading.get(), false)
  equal(pages.add().error.get(), undefined)
  equalWithText(pages.add().sortedCandidates.get(), [
    {
      loader: loaders.atom,
      name: 'atom',
      title: '',
      url: 'http://other.com/atom'
    }
  ])
})

test('ignores duplicate links', async () => {
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().error)
  keepMount(pages.add().sortedCandidates)

  expectRequest('http://example.com').andRespond(
    200,
    `<html>
      <link type="application/atom+xml" href="http://other.com/atom">
      <a href="http://other.com/atom">Feed</a>
    </html>`
  )
  let rss = '<feed><title>Feed</title></feed>'
  expectRequest('http://other.com/atom').andRespond(200, rss, 'text/xml')

  pages.add().setUrl('example.com')
  await setTimeout(10)
  equal(pages.add().candidatesLoading.get(), false)
  equal(pages.add().error.get(), undefined)
  equalWithText(pages.add().sortedCandidates.get(), [
    {
      loader: loaders.atom,
      name: 'atom',
      title: 'Feed',
      url: 'http://other.com/atom'
    }
  ])
})

test('looks for popular RSS, Atom and JsonFeed places', async () => {
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().error)
  keepMount(pages.add().sortedCandidates)

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  let atom = '<feed><title></title></feed>'
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(200, atom, 'text/xml')
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)

  pages.add().setUrl('example.com')

  await setTimeout(10)
  equal(pages.add().candidatesLoading.get(), false)
  equal(pages.add().error.get(), undefined)
  equalWithText(pages.add().sortedCandidates.get(), [
    {
      loader: loaders.atom,
      name: 'atom',
      title: '',
      url: 'http://example.com/atom'
    }
  ])
})

test('shows if unknown URL', async () => {
  keepMount(pages.add().candidatesLoading)
  keepMount(pages.add().error)
  keepMount(pages.add().sortedCandidates)
  keepMount(pages.add().noResults)

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)

  await pages.add().setUrl('example.com')
  equal(pages.add().candidatesLoading.get(), false)
  equal(pages.add().error.get(), undefined)
  deepStrictEqual(pages.add().sortedCandidates.get(), [])
  equal(pages.add().noResults.get(), true)
})

test('always keep the same order of candidates', async () => {
  keepMount(pages.add().sortedCandidates)
  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'application/rss+xml'
  )
  expectRequest('http://example.com/feed.json').andRespond(
    200,
    '{ "version": "https://jsonfeed.org/version/1.1", "title": "JsonFeed", "items": [] }',
    'application/json'
  )
  expectRequest('http://example.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  await pages.add().setUrl('example.com')

  deepStrictEqual(
    pages
      .add()
      .sortedCandidates.get()
      .map(i => i.title),
    ['Atom', 'JsonFeed', 'RSS']
  )

  pages.add().exit()
  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  let atom = expectRequest('http://example.com/atom').andWait()
  let jsonFeed = expectRequest('http://example.com/feed.json').andWait()
  expectRequest('http://example.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  pages.add().setUrl('example.com')
  await setTimeout(10)
  atom(200, '<feed><title>Atom</title></feed>', 'application/rss+xml')
  jsonFeed(
    200,
    '{ "version": "https://jsonfeed.org/version/1.1", "title": "JsonFeed", "items": [] }',
    'application/json'
  )
  await setTimeout(10)

  deepStrictEqual(
    pages
      .add()
      .sortedCandidates.get()
      .map(i => i.title),
    ['Atom', 'JsonFeed', 'RSS']
  )
})

test('changes URL during typing in the field', async () => {
  equal(pages.add().url.get(), undefined)

  pages.add().setUrl('')
  equal(pages.add().url.get(), undefined)

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  pages.add().setUrl('example.com')
  equal(pages.add().url.get(), 'http://example.com')
  await setTimeout(10)

  pages.add().inputUrl('other')
  equal(pages.add().url.get(), 'http://example.com')

  pages.add().inputUrl('other.')
  equal(pages.add().url.get(), 'http://example.com')

  expectRequest('http://other.net').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://other.net/feed').andRespond(404)
  expectRequest('http://other.net/atom').andRespond(404)
  expectRequest('http://other.net/feed.json').andRespond(404)
  expectRequest('http://other.net/rss').andRespond(404)
  pages.add().inputUrl('other.net')
  await setTimeout(500)
  equal(pages.add().url.get(), 'http://other.net')

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  pages.add().inputUrl('other.net/some')
  pages.add().setUrl('example.com')
  await setTimeout(500)
  equal(pages.add().url.get(), 'http://example.com')

  pages.add().inputUrl('')
  await setTimeout(500)
  equal(pages.add().url.get(), undefined)
})
