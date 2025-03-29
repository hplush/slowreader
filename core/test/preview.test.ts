import './dom-parser.ts'

import { ensureLoaded } from '@logux/client'
import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
import { deepStrictEqual, equal, ok } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPreviewCandidate,
  checkAndRemoveRequestMock,
  clearPreview,
  createPostsList,
  currentCandidate,
  expectRequest,
  getFeeds,
  getPosts,
  loaders,
  mockRequest,
  onPreviewUrlType,
  previewCandidate,
  type PreviewCandidate,
  previewCandidateAdded,
  previewCandidates,
  previewCandidatesLoading,
  previewNoResults,
  previewPosts,
  previewUrl,
  previewUrlError,
  router,
  setBaseTestRoute,
  setIsMobile,
  setPreviewCandidate,
  setPreviewUrl,
  testFeed
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

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
  clearPreview()
  checkAndRemoveRequestMock()
})

function equalWithText(a: PreviewCandidate[], b: PreviewCandidate[]): void {
  equal(a.length, b.length)
  for (let i = 0; i < a.length; i++) {
    let aFix = { ...a[i], text: undefined }
    let bFix = { ...b[i], text: undefined }
    deepStrictEqual(aFix, bFix)
  }
}

test('empty from beginning', () => {
  keepMount(previewUrlError)
  keepMount(previewCandidatesLoading)
  keepMount(previewCandidates)

  equal(previewUrlError.get(), undefined)
  equal(previewCandidatesLoading.get(), false)
  deepStrictEqual(previewCandidates.get(), [])
})

test('validates URL', () => {
  keepMount(previewUrlError)

  setPreviewUrl('mailto:user@example.com')
  equal(previewUrlError.get(), 'invalidUrl')

  setPreviewUrl('http://a b')
  equal(previewUrlError.get(), 'invalidUrl')

  setPreviewUrl('not URL')
  equal(previewUrlError.get(), 'invalidUrl')

  equal(previewNoResults.get(), false)
})

test('uses HTTPS for specific domains', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewCandidates)
  spyOn(loaders.rss, 'getMineLinksFromText', () => [])
  spyOn(loaders.atom, 'getMineLinksFromText', () => [])
  spyOn(loaders.jsonFeed, 'getMineLinksFromText', () => [])
  spyOn(loaders.rss, 'getSuggestedLinksFromText', () => [])
  spyOn(loaders.atom, 'getSuggestedLinksFromText', () => [])
  spyOn(loaders.jsonFeed, 'getSuggestedLinksFromText', () => [])

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  setPreviewUrl('twitter.com/blog')
  await setTimeout(10)

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  setPreviewUrl('http://twitter.com/blog')
  await setTimeout(10)
})

test('cleans state', async () => {
  keepMount(previewUrlError)
  keepMount(previewCandidates)
  keepMount(previewPosts)
  keepMount(previewCandidate)

  let reply = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')
  await setTimeout(10)

  clearPreview()
  equal(previewUrlError.get(), undefined)
  deepStrictEqual(previewCandidates.get(), [])
  equal(reply.aborted, true)
  equal(previewPosts.get(), undefined)
  equal(previewCandidate.get(), undefined)

  setPreviewUrl('not URL')

  clearPreview()
  equal(previewUrlError.get(), undefined)
  deepStrictEqual(previewCandidates.get(), [])
})

test('is ready for network errors', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)

  let reply = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')

  equal(previewCandidatesLoading.get(), true)
  equal(previewUrlError.get(), undefined)
  equal(previewNoResults.get(), false)

  await reply(404)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), 'unloadable')
  equal(previewNoResults.get(), false)

  setPreviewUrl('')
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equal(previewNoResults.get(), false)
})

test('aborts all HTTP requests on URL change', async () => {
  let reply1 = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')

  setPreviewUrl('')
  await setTimeout(10)
  equal(reply1.aborted, true)

  let reply2 = expectRequest('http://other.com').andWait()
  setPreviewUrl('other.com')

  clearPreview()
  await setTimeout(10)
  equal(reply2.aborted, true)
})

test('detects RSS links', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)

  let replyHtml = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')
  await setTimeout(10)
  equal(previewCandidatesLoading.get(), true)
  equal(previewUrlError.get(), undefined)
  deepStrictEqual(previewCandidates.get(), [])
  equal(previewNoResults.get(), false)

  let replyRss = expectRequest('http://example.com/news').andWait()
  replyHtml(
    200,
    '<!DOCTYPE html><html><head>' +
      '<link rel="alternate" type="application/rss+xml" href="/news">' +
      '</head></html>'
  )
  await setTimeout(10)
  equal(previewCandidatesLoading.get(), true)
  equal(previewUrlError.get(), undefined)
  deepStrictEqual(previewCandidates.get(), [])
  equal(previewNoResults.get(), false)

  let rss = '<rss><channel><title> News </title></channel></rss>'
  replyRss(200, rss, 'application/rss+xml')
  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      loader: 'rss',
      title: 'News',
      url: 'http://example.com/news'
    }
  ])
  equal(previewNoResults.get(), false)
})

test('is ready for empty title', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)

  expectRequest('http://example.com').andRespond(
    200,
    `<html>
      <link type="application/atom+xml" href="http://other.com/atom">
    </html>`
  )
  let rss = '<feed><title></title></feed>'
  expectRequest('http://other.com/atom').andRespond(200, rss, 'text/xml')

  setPreviewUrl('example.com')
  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      loader: 'atom',
      title: '',
      url: 'http://other.com/atom'
    }
  ])
})

test('ignores duplicate links', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)

  expectRequest('http://example.com').andRespond(
    200,
    `<html>
      <link type="application/atom+xml" href="http://other.com/atom">
      <a href="http://other.com/atom">Feed</a>
    </html>`
  )
  let rss = '<feed><title>Feed</title></feed>'
  expectRequest('http://other.com/atom').andRespond(200, rss, 'text/xml')

  setPreviewUrl('example.com')
  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      loader: 'atom',
      title: 'Feed',
      url: 'http://other.com/atom'
    }
  ])
})

test('looks for popular RSS, Atom and JsonFeed places', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  let atom = '<feed><title></title></feed>'
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(200, atom, 'text/xml')
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)

  setPreviewUrl('example.com')

  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      loader: 'atom',
      title: '',
      url: 'http://example.com/atom'
    }
  ])
})

test('shows if unknown URL', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)

  setPreviewUrl('example.com')

  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  deepStrictEqual(previewCandidates.get(), [])
  equal(previewNoResults.get(), true)
})

test('always keep the same order of candidates', async () => {
  keepMount(previewCandidates)
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
  setPreviewUrl('example.com')
  await setTimeout(10)

  deepStrictEqual(
    previewCandidates.get().map(i => i.title),
    ['Atom', 'JsonFeed', 'RSS']
  )

  clearPreview()
  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  let atom = expectRequest('http://example.com/atom').andWait()
  let jsonFeed = expectRequest('http://example.com/feed.json').andWait()
  expectRequest('http://example.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  setPreviewUrl('example.com')
  await setTimeout(10)
  atom(200, '<feed><title>Atom</title></feed>', 'application/rss+xml')
  jsonFeed(
    200,
    '{ "version": "https://jsonfeed.org/version/1.1", "title": "JsonFeed", "items": [] }',
    'application/json'
  )
  await setTimeout(10)

  deepStrictEqual(
    previewCandidates.get().map(i => i.title),
    ['Atom', 'JsonFeed', 'RSS']
  )
})

test('tracks current candidate', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)
  keepMount(previewCandidate)
  let getAtomPosts = spyOn(loaders.atom, 'getPosts')
  let getRssPosts = spyOn(loaders.rss, 'getPosts')
  let getJsonFeedPosts = spyOn(loaders.jsonFeed, 'getPosts')

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
  getAtomPosts.nextResult(
    createPostsList([{ media: [], originId: '1', url: '1' }], undefined)
  )
  setPreviewUrl('example.com')
  await setTimeout(10)

  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get().length, 3)
  equal(previewCandidate.get(), 'http://example.com/atom')
  deepStrictEqual(previewPosts.get()!.get(), {
    hasNext: false,
    isLoading: false,
    list: [{ media: [], originId: '1', url: '1' }]
  })
  equal(getAtomPosts.calls.length, 1)
  equal(getAtomPosts.calls[0]![1], 'http://example.com/atom')

  getRssPosts.nextResult(
    createPostsList([{ media: [], originId: '2', url: '2' }], undefined)
  )
  setPreviewCandidate('http://example.com/rss')
  await setTimeout(10)

  equal(previewCandidate.get(), 'http://example.com/rss')
  deepStrictEqual(previewPosts.get()!.get(), {
    hasNext: false,
    isLoading: false,
    list: [{ media: [], originId: '2', url: '2' }]
  })
  equal(getRssPosts.calls.length, 1)
  equal(getRssPosts.calls[0]![1], 'http://example.com/rss')

  getJsonFeedPosts.nextResult(
    createPostsList([{ media: [], originId: '3', url: '3' }], undefined)
  )
  setPreviewCandidate('http://example.com/feed.json')
  await setTimeout(10)

  equal(previewCandidate.get(), 'http://example.com/feed.json')
  deepStrictEqual(previewPosts.get()!.get(), {
    hasNext: false,
    isLoading: false,
    list: [{ media: [], originId: '3', url: '3' }]
  })
  equal(getJsonFeedPosts.calls.length, 1)
  equal(getJsonFeedPosts.calls[0]![1], 'http://example.com/feed.json')

  setPreviewCandidate('http://example.com/atom')
  await setTimeout(10)

  equal(previewCandidate.get(), 'http://example.com/atom')
  deepStrictEqual(previewPosts.get()!.get(), {
    hasNext: false,
    isLoading: false,
    list: [{ media: [], originId: '1', url: '1' }]
  })
  equal(getAtomPosts.calls.length, 1)

  setPreviewCandidate('http://example.com/rss')
  await setTimeout(10)

  equal(previewCandidate.get(), 'http://example.com/rss')
  deepStrictEqual(previewPosts.get()!.get(), {
    hasNext: false,
    isLoading: false,
    list: [{ media: [], originId: '2', url: '2' }]
  })
  equal(getRssPosts.calls.length, 1)

  setPreviewCandidate('http://example.com/feed.json')
  await setTimeout(10)

  equal(previewCandidate.get(), 'http://example.com/feed.json')
  deepStrictEqual(previewPosts.get()!.get(), {
    hasNext: false,
    isLoading: false,
    list: [{ media: [], originId: '3', url: '3' }]
  })
  equal(getJsonFeedPosts.calls.length, 1)
})

test('tracks added status of candidate', async () => {
  keepMount(previewCandidateAdded)

  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  equal(previewCandidateAdded.get(), undefined)

  await setTimeout(10)
  equal(previewCandidateAdded.get(), false)

  await addFeed(
    testFeed({
      loader: 'rss',
      title: 'RSS',
      url: 'https://a.com/rss'
    })
  )
  equal(previewCandidateAdded.get(), false)

  let id = await addFeed(
    testFeed({
      loader: 'atom',
      title: 'Atom',
      url: 'https://a.com/atom'
    })
  )
  equal(previewCandidateAdded.get(), id)

  expectRequest('https://b.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'text/xml'
  )
  setPreviewUrl('https://b.com/atom')
  equal(previewCandidateAdded.get(), undefined)
})

test('adds current preview candidate', async () => {
  keepMount(previewCandidateAdded)
  let $feeds = getFeeds()
  keepMount($feeds)
  await $feeds.loading

  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)
  equal(ensureLoaded($feeds.get()).list.length, 0)
  await addPreviewCandidate()

  equal(typeof previewCandidateAdded.get(), 'string')
  equal(ensureLoaded($feeds.get()).list.length, 1)
  equal(ensureLoaded($feeds.get()).list[0]!.lastOriginId, '2')
  equal(ensureLoaded($feeds.get()).list[0]!.lastPublishedAt, 1688169600)
})

test('adds last post for current preview', async () => {
  keepMount(previewCandidateAdded)
  let $posts = getPosts({})
  keepMount($posts)
  await $posts.loading
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)
  equal(ensureLoaded($posts.get()).list.length, 0)

  await addPreviewCandidate()

  equal(ensureLoaded($posts.get()).list.length, 1)
  equal(ensureLoaded($posts.get()).list[0]!.originId, '2')
})

test('adds current preview candidate without posts', async () => {
  keepMount(previewCandidateAdded)
  let $feeds = getFeeds()
  keepMount($feeds)
  await $feeds.loading

  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)
  equal(ensureLoaded($feeds.get()).list.length, 0)

  await addPreviewCandidate()

  equal(typeof previewCandidateAdded.get(), 'string')
  equal(ensureLoaded($feeds.get()).list.length, 1)
  equal(ensureLoaded($feeds.get()).list[0]!.lastOriginId, undefined)

  let lastPublishedAt = ensureLoaded($feeds.get()).list[0]!.lastPublishedAt!
  let now = Date.now() / 1000
  ok(lastPublishedAt <= now)
  ok(lastPublishedAt > now / 1000 - 2000)
})

test('changes URL during typing in the field', async () => {
  equal(previewUrl.get(), '')

  setPreviewUrl('')
  equal(previewUrl.get(), '')

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  setPreviewUrl('example.com')
  equal(previewUrl.get(), 'http://example.com')
  await setTimeout(10)

  onPreviewUrlType('other')
  equal(previewUrl.get(), 'http://example.com')

  onPreviewUrlType('other.')
  equal(previewUrl.get(), 'http://example.com')

  expectRequest('http://other.net').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://other.net/feed').andRespond(404)
  expectRequest('http://other.net/atom').andRespond(404)
  expectRequest('http://other.net/feed.json').andRespond(404)
  expectRequest('http://other.net/rss').andRespond(404)
  onPreviewUrlType('other.net')
  await setTimeout(500)
  equal(previewUrl.get(), 'http://other.net')

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed.json').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  onPreviewUrlType('other.net/some')
  setPreviewUrl('example.com')
  await setTimeout(500)
  equal(previewUrl.get(), 'http://example.com')
})

test('syncs URL with router', () => {
  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: undefined },
    popups: [],
    route: 'add'
  })

  expectRequest('http://example.com').andRespond(404)
  setPreviewUrl('example.com')
  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: 'http://example.com' },
    popups: [],
    route: 'add'
  })

  expectRequest('https://other.com').andRespond(404)
  setPreviewUrl('https://other.com')
  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: 'https://other.com' },
    popups: [],
    route: 'add'
  })

  expectRequest('http://example.com').andRespond(404)
  setBaseTestRoute({
    params: { candidate: undefined, url: 'http://example.com' },
    route: 'add'
  })
  deepStrictEqual(previewUrl.get(), 'http://example.com')

  setBaseTestRoute({
    params: { candidate: undefined, url: undefined },
    route: 'add'
  })
  deepStrictEqual(previewUrl.get(), '')

  expectRequest('https://new.com').andRespond(404)
  setPreviewUrl('https://new.com')
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(previewUrl.get(), '')
})

test('show candidate on wide screen', async () => {
  setIsMobile(false)
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)

  deepStrictEqual(router.get(), {
    params: { candidate: 'https://a.com/atom', url: 'https://a.com/atom' },
    popups: [],
    route: 'add'
  })
  equal(currentCandidate.get(), undefined)
  equal(previewCandidate.get(), 'https://a.com/atom')
})

test('do not show candidate on mobile screen', async () => {
  setIsMobile(true)
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)

  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: 'https://a.com/atom' },
    popups: [],
    route: 'add'
  })
  equal(previewCandidate.get(), undefined)
})

test('redirect to candidates list if no current candidate', async () => {
  setBaseTestRoute({
    params: {
      candidate: 'unknown candidate',
      url: 'https://a.com/atom'
    },
    route: 'add'
  })

  await setTimeout(10)
  equal(previewCandidate.get(), undefined)
  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: 'https://a.com/atom' },
    popups: [],
    route: 'add'
  })
})
