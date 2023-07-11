import '../test/dom-parser.js'

import { restoreAll, spyOn } from 'nanospy'
import { cleanStores } from 'nanostores'
import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  checkAndRemoveRequestMock,
  clearPreview,
  expectRequest,
  loaders,
  mockRequest,
  previewCandidate,
  type PreviewCandidate,
  previewCandidates,
  previewCandidatesLoading,
  previewPosts,
  previewPostsLoading,
  previewUrlError,
  setPreviewCandidate,
  setPreviewUrl
} from '../index.js'

test.before.each(() => {
  mockRequest()
})

test.after.each(() => {
  restoreAll()
  cleanStores(previewUrlError, previewCandidatesLoading, previewCandidates)
  clearPreview()
  checkAndRemoveRequestMock()
})

function equalWithText(a: PreviewCandidate[], b: PreviewCandidate[]): void {
  equal(a.length, b.length)
  for (let i = 0; i < a.length; i++) {
    let aFix = { ...a[i], text: undefined }
    let bFix = { ...b[i], text: undefined }
    equal(aFix, bFix)
  }
}

test('empty from beginning', () => {
  previewUrlError.listen(() => {})
  previewCandidatesLoading.listen(() => {})
  previewCandidates.listen(() => {})

  equal(previewUrlError.get(), undefined)
  equal(previewCandidatesLoading.get(), false)
  equal(previewCandidates.get(), [])
})

test('validates URL', () => {
  previewUrlError.listen(() => {})

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
  previewCandidatesLoading.listen(() => {})
  previewCandidates.listen(() => {})
  spyOn(loaders.rss, 'getMineLinksFromText', () => [])

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  setPreviewUrl('twitter.com/blog')
  await setTimeout(10)

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  setPreviewUrl('http://twitter.com/blog')
  await setTimeout(10)
})

test('cleans state', async () => {
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})
  previewPosts.listen(() => {})
  previewPostsLoading.listen(() => {})
  previewCandidate.listen(() => {})

  let reply = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')
  await setTimeout(10)

  clearPreview()
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])
  equal(reply.aborted, true)
  equal(previewPosts.get(), [])
  equal(previewPostsLoading.get(), false)
  equal(previewCandidate.get(), undefined)

  setPreviewUrl('not URL')

  clearPreview()
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])
})

test('is ready for network errors', async () => {
  previewCandidatesLoading.listen(() => {})
  previewUrlError.listen(() => {})

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
  previewCandidatesLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

  let replyHtml = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')
  await setTimeout(10)
  equal(previewCandidatesLoading.get(), true)
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])

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
  equal(previewCandidates.get(), [])

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
  previewCandidatesLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

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
      loader: 'rss',
      title: '',
      url: 'http://other.com/atom'
    }
  ])
})

test('looks for popular RSS places', async () => {
  previewCandidatesLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  let rss = '<feed><title></title></feed>'
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(200, rss, 'text/xml')

  setPreviewUrl('example.com')

  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      loader: 'rss',
      title: '',
      url: 'http://example.com/atom'
    }
  ])
})

test('shows if unknown URL', async () => {
  previewCandidatesLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)

  setPreviewUrl('example.com')

  await setTimeout(10)
  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])
})

test('tracks current candidate', async () => {
  previewCandidatesLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})
  previewCandidate.listen(() => {})
  previewPostsLoading.listen(() => {})
  let getPosts = spyOn(loaders.rss, 'getPosts')

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(
    200,
    '<rss><title>RSS</title></rss>',
    'application/rss+xml'
  )
  expectRequest('http://example.com/atom').andRespond(
    200,
    '<feed><title>Atom</title></feed>',
    'application/rss+xml'
  )
  let resolvePosts1 = getPosts.nextResolve()
  setPreviewUrl('example.com')
  await setTimeout(10)

  equal(previewCandidatesLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get().length, 2)
  equal(previewCandidate.get(), 'http://example.com/rss')
  equal(previewPostsLoading.get(), true)
  equal(previewPosts.get(), [])
  equal(getPosts.calls.length, 1)
  equal(getPosts.calls[0][1], 'http://example.com/rss')

  await resolvePosts1([{ id: '1' }])
  equal(previewPostsLoading.get(), false)
  equal(previewPosts.get(), [{ id: '1' }])

  getPosts.nextResolve()
  setPreviewCandidate('http://example.com/atom')
  await setTimeout(10)

  equal(previewCandidate.get(), 'http://example.com/atom')
  equal(previewPostsLoading.get(), true)
  equal(previewPosts.get(), [])
  equal(getPosts.calls.length, 2)
  equal(getPosts.calls[1][1], 'http://example.com/atom')

  setPreviewCandidate('http://example.com/rss')
  await setTimeout(10)

  equal(previewCandidate.get(), 'http://example.com/rss')
  equal(previewPostsLoading.get(), false)
  equal(previewPosts.get(), [{ id: '1' }])
  equal(getPosts.calls.length, 2)

  let resolvePosts2 = getPosts.nextResolve()
  setPreviewCandidate('http://example.com/atom')
  await setTimeout(10)
  await resolvePosts2([{ id: '2' }])

  equal(previewCandidate.get(), 'http://example.com/atom')
  equal(previewPostsLoading.get(), false)
  equal(previewPosts.get(), [{ id: '2' }])
  equal(getPosts.calls.length, 3)
})

test.run()
