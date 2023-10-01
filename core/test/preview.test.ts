import './dom-parser.js'

import { ensureLoaded } from '@logux/client'
import { restoreAll, spyOn } from 'nanospy'
import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPreviewCandidate,
  checkAndRemoveRequestMock,
  clearPreview,
  createPostsPage,
  expectRequest,
  getFeeds,
  loaders,
  mockRequest,
  previewCandidate,
  type PreviewCandidate,
  previewCandidateAdded,
  previewCandidates,
  previewCandidatesLoading,
  previewPosts,
  previewUrlError,
  setPreviewCandidate,
  setPreviewUrl
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
  mockRequest()
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

  setPreviewUrl('')
  equal(previewUrlError.get(), 'emptyUrl')

  setPreviewUrl(' ')
  equal(previewUrlError.get(), 'emptyUrl')

  setPreviewUrl('mailto:user@example.com')
  equal(previewUrlError.get(), 'invalidUrl')

  setPreviewUrl('http://a b')
  equal(previewUrlError.get(), 'invalidUrl')

  setPreviewUrl('not URL')
  equal(previewUrlError.get(), 'invalidUrl')
})

test('uses HTTPS for specific domains', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewCandidates)
  spyOn(loaders.rss, 'getMineLinksFromText', () => [])
  spyOn(loaders.atom, 'getMineLinksFromText', () => [])

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

  await reply(404)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), 'unloadable')

  setPreviewUrl('')
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), 'emptyUrl')
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

  let rss = '<rss><channel><title>News</title></channel></rss>'
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
})

test('is ready for empty title', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)

  expectRequest('http://example.com').andRespond(
    200,
    '<link type="application/atom+xml" href="http://other.com/atom">'
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

test('looks for popular RSS and Atom places', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  let atom = '<feed><title></title></feed>'
  expectRequest('http://example.com/atom').andRespond(200, atom, 'text/xml')
  expectRequest('http://example.com/feed').andRespond(404)
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
  expectRequest('http://example.com/atom').andRespond(404)
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)

  setPreviewUrl('example.com')

  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  deepStrictEqual(previewCandidates.get(), [])
})

test('tracks current candidate', async () => {
  keepMount(previewCandidatesLoading)
  keepMount(previewUrlError)
  keepMount(previewCandidates)
  keepMount(previewCandidate)
  let getAtomPosts = spyOn(loaders.atom, 'getPosts')
  let getRssPosts = spyOn(loaders.rss, 'getPosts')

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'application/rss+xml'
  )
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(
    200,
    '<rss><channel><title>RSS</title></channel></rss>',
    'application/rss+xml'
  )
  getAtomPosts.nextResult(
    createPostsPage([{ media: [], originId: '1', url: '1' }], undefined)
  )
  setPreviewUrl('example.com')
  await setTimeout(10)

  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get().length, 2)
  equal(previewCandidate.get(), 'http://example.com/atom')
  deepStrictEqual(previewPosts.get()!.get(), {
    hasNext: false,
    isLoading: false,
    list: [{ media: [], originId: '1', url: '1' }]
  })
  equal(getAtomPosts.calls.length, 1)
  equal(getAtomPosts.calls[0][1], 'http://example.com/atom')

  getRssPosts.nextResult(
    createPostsPage([{ media: [], originId: '2', url: '2' }], undefined)
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
  equal(getRssPosts.calls[0][1], 'http://example.com/rss')

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

  await addFeed({
    loader: 'rss',
    reading: 'fast',
    title: 'RSS',
    url: 'https://a.com/rss'
  })
  equal(previewCandidateAdded.get(), false)

  let id = await addFeed({
    loader: 'atom',
    reading: 'fast',
    title: 'Atom',
    url: 'https://a.com/atom'
  })
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
    '<feed><title>Atom</title></feed>',
    'text/xml'
  )
  setPreviewUrl('https://a.com/atom')
  await setTimeout(10)
  equal(ensureLoaded($feeds.get()).list.length, 0)

  await addPreviewCandidate()

  equal(typeof previewCandidateAdded.get(), 'string')
  equal(ensureLoaded($feeds.get()).list.length, 1)
})
