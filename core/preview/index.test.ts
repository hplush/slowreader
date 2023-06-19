import '../test/dom-parser.js'

import { cleanStores } from 'nanostores'
import { setTimeout } from 'node:timers/promises'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  checkAndRemoveRequestMock,
  clearPreview,
  expectRequest,
  mockRequest,
  type PreviewCandidate,
  previewCandidates,
  previewLoading,
  previewUrlError,
  setPreviewUrl
} from '../index.js'

test.before.each(() => {
  mockRequest()
})

test.after.each(() => {
  cleanStores(previewUrlError, previewLoading, previewCandidates)
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
  previewLoading.listen(() => {})
  previewCandidates.listen(() => {})

  equal(previewUrlError.get(), undefined)
  equal(previewLoading.get(), false)
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
  previewLoading.listen(() => {})
  previewCandidates.listen(() => {})

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  expectRequest('https://twitter.com/feed').andRespond(404)
  expectRequest('https://twitter.com/rss').andRespond(404)
  expectRequest('https://twitter.com/atom').andRespond(404)
  setPreviewUrl('twitter.com/blog')

  await setTimeout(10)
  equal(previewLoading.get(), false)
  equal(previewCandidates.get(), [])

  expectRequest('https://twitter.com/blog').andRespond(200, '')
  expectRequest('https://twitter.com/feed').andRespond(404)
  expectRequest('https://twitter.com/rss').andRespond(404)
  expectRequest('https://twitter.com/atom').andRespond(404)
  setPreviewUrl('http://twitter.com/blog')

  await setTimeout(10)
  equal(previewLoading.get(), false)
  equal(previewCandidates.get(), [])
})

test('cleans state', async () => {
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

  let reply = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')
  await setTimeout(10)

  clearPreview()
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])
  equal(reply.aborted, true)

  setPreviewUrl('not URL')

  clearPreview()
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])
})

test('is ready for network errors', async () => {
  previewLoading.listen(() => {})
  previewUrlError.listen(() => {})

  let reply = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')

  equal(previewLoading.get(), true)
  equal(previewUrlError.get(), undefined)

  await reply(404)
  equal(previewLoading.get(), false)
  equal(previewUrlError.get(), 'unloadable')

  setPreviewUrl('')
  equal(previewLoading.get(), false)
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
  previewLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

  let replyHtml = expectRequest('http://example.com').andWait()
  setPreviewUrl('example.com')
  await setTimeout(10)
  equal(previewLoading.get(), true)
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
  equal(previewLoading.get(), true)
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])

  let rss = '<rss><channel><title>News</title></channel></rss>'
  replyRss(200, rss, 'application/rss+xml')
  await setTimeout(10)
  equal(previewLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      source: 'rss',
      title: 'News',
      url: 'http://example.com/news'
    }
  ])
})

test('is ready for empty title', async () => {
  previewLoading.listen(() => {})
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
  equal(previewLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      source: 'rss',
      title: '',
      url: 'http://other.com/atom'
    }
  ])
})

test('looks for popular RSS places', async () => {
  previewLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  let rss = '<feed><title></title></feed>'
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(200, rss, 'text/xml')

  setPreviewUrl('example.com')

  await setTimeout(10)
  equal(previewLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equalWithText(previewCandidates.get(), [
    {
      source: 'rss',
      title: '',
      url: 'http://example.com/atom'
    }
  ])
})

test('shows if unknown URL', async () => {
  previewLoading.listen(() => {})
  previewUrlError.listen(() => {})
  previewCandidates.listen(() => {})

  expectRequest('http://example.com').andRespond(200, '<html>Nothing</html>')
  expectRequest('http://example.com/feed').andRespond(404)
  expectRequest('http://example.com/rss').andRespond(404)
  expectRequest('http://example.com/atom').andRespond(404)

  setPreviewUrl('example.com')

  await setTimeout(10)
  equal(previewLoading.get(), false)
  equal(previewUrlError.get(), undefined)
  equal(previewCandidates.get(), [])
})

test.run()
