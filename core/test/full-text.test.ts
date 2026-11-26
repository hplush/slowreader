import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFullTexts,
  createDownloadTask,
  downloadFullText,
  HTTPStatusError,
  isAllowedByRobots,
  isFullTextDownloaded,
  organizeMessages,
  robotsRecords
} from '../index.ts'
import {
  checkAndRemoveRequestMock,
  expectRequest,
  mockRequest,
  setupNodeDom,
  throws
} from './utils.ts'

setupNodeDom()

const DAY = 24 * 60 * 60_000

const TEXT =
  'Long paragraph of the article, which is long enough to look like ' +
  'a real text for Mozilla’s Readability, which skips short paragraphs. '

function article(body: string, head = ''): string {
  return (
    `<!DOCTYPE html><html><head><title>Post</title>${head}</head><body>` +
    `<nav><a href="/">Home</a></nav><article><h1>Post</h1>` +
    `<p>${TEXT.repeat(4)}</p><p>${TEXT.repeat(4)}</p>${body}` +
    `<p>${TEXT.repeat(4)}</p></article><footer>Footer</footer></body></html>`
  )
}

describe('full text', () => {
  beforeEach(() => {
    mockRequest()
    robotsRecords.set({})
  })

  afterEach(() => {
    robotsRecords.set({})
    checkAndRemoveRequestMock()
  })

  test('caches robots.txt for a week per origin', async () => {
    let task = createDownloadTask()
    expectRequest('https://a.com/robots.txt').andRespond(
      200,
      'User-agent: *\nDisallow: /private\n',
      'text/plain'
    )
    equal(
      await isAllowedByRobots(task, ['https://a.com/1', 'https://a.com/2']),
      true
    )
    equal(await isAllowedByRobots(task, ['https://a.com/private/1']), false)

    robotsRecords.set({
      'https://a.com': {
        ...robotsRecords.get()['https://a.com']!,
        checkedAt: Date.now() - 8 * DAY
      }
    })
    expectRequest('https://a.com/robots.txt').andRespond(
      200,
      'User-agent: slowreader\nDisallow: /\n',
      'text/plain'
    )
    equal(await isAllowedByRobots(task, ['https://a.com/1']), false)
  })

  test('allows everything without robots.txt', async () => {
    expectRequest('https://a.com/robots.txt').andRespond(404)
    equal(
      await isAllowedByRobots(createDownloadTask(), ['https://a.com/1']),
      true
    )
  })

  test('uses saved rules or allows on server errors', async () => {
    let task = createDownloadTask({ tries: 1 })
    expectRequest('https://a.com/robots.txt').andRespond(429)
    equal(await isAllowedByRobots(task, ['https://a.com/1']), true)
    deepEqual(robotsRecords.get(), {})

    robotsRecords.set({
      'https://a.com': {
        checkedAt: Date.now() - 8 * DAY,
        rules: [[false, '/']]
      },
      'https://old.com': { checkedAt: Date.now() - 15 * DAY, rules: [] }
    })
    expectRequest('https://a.com/robots.txt').andRespond(500)
    equal(await isAllowedByRobots(task, ['https://a.com/1']), false)

    expectRequest('https://b.com/robots.txt').andRespond(200, '', 'text/plain')
    await isAllowedByRobots(task, ['https://b.com/1'])
    deepEqual(Object.keys(robotsRecords.get()).toSorted(), [
      'https://a.com',
      'https://b.com'
    ])
  })

  test('extracts article from the page', async () => {
    expectRequest('https://a.com/blog/1').andRespond(
      200,
      article(
        '<p><a href="2">Next</a> <img src="/a.png"></p>' +
          '<p><img src="data:image/gif;base64,R0lGOD">' +
          '<noscript><img src="/real.png"></noscript></p>'
      )
    )
    let full = await downloadFullText(
      createDownloadTask(),
      'https://a.com/blog/1'
    )
    ok(full)
    ok(isFullTextDownloaded({ full }))
    ok(!isFullTextDownloaded({ full: TEXT }))
    ok(full.includes(TEXT))
    ok(!full.includes('Footer'))
    ok(full.includes('href="https://a.com/blog/2"'))
    ok(full.includes('src="https://a.com/a.png"'))
    ok(full.includes('src="https://a.com/real.png"'))
    ok(!full.includes('data:image'))
  })

  test('finds article in unlikely parts of the page', async () => {
    expectRequest('https://a.com/1').andRespond(
      200,
      '<!DOCTYPE html><html><body><div class="sidebar">' +
        `<p>${TEXT.repeat(3)}</p><p>${TEXT.repeat(3)}</p></div>` +
        '<footer>Footer</footer></body></html>'
    )
    let full = await downloadFullText(createDownloadTask(), 'https://a.com/1')
    ok(full.includes(TEXT))
  })

  test('uses base of the page', async () => {
    expectRequest('https://a.com/blog/1').andRespond(
      200,
      article('<p><a href="2">Next</a></p>', '<base href="/other/">')
    )
    let full = await downloadFullText(
      createDownloadTask(),
      'https://a.com/blog/1'
    )
    ok(full?.includes('href="https://a.com/other/2"'))
  })

  test('throws on pages without article', async () => {
    let noArticle = organizeMessages.get().extractNoArticle
    expectRequest('https://a.com/1').andRespond(
      200,
      '<!DOCTYPE html><html><body><p>Short</p></body></html>'
    )
    let error = await throws(() => {
      return downloadFullText(createDownloadTask(), 'https://a.com/1')
    })
    equal(error.message, noArticle)
    expectRequest('https://a.com/2').andRespond(200, '{}', 'application/json')
    error = await throws(() => {
      return downloadFullText(createDownloadTask(), 'https://a.com/2')
    })
    equal(error.message, noArticle)
  })

  test('replaces text of posts', async () => {
    let task = createDownloadTask({ tries: 1 })
    expectRequest('https://a.com/robots.txt').andRespond(404)
    expectRequest('https://a.com/1').andRespond(200, article(''))
    expectRequest('https://a.com/2').andRespond(500)
    expectRequest('https://a.com/4').andRespond(
      200,
      article('<p><img src="/a.png" alt="A"></p>')
    )
    expectRequest('https://a.com/5').andRespond(
      200,
      article('<p><img src="/b.png"></p>')
    )
    let result = await addFullTexts(task, [
      {
        full: 'Feed 1',
        id: '1',
        intro: 'Intro',
        originId: '1',
        url: 'https://a.com/1'
      },
      { full: 'Feed 2', id: '2', originId: '2', url: 'https://a.com/2' },
      { full: 'Feed 3', id: '3', originId: '3' },
      { full: 'Feed 4', id: '4', originId: '4', url: 'https://a.com/4' },
      {
        full: 'Feed 5',
        id: '5',
        media: [{ type: 'image', url: 'https://a.com/feed.png' }],
        originId: '5',
        url: 'https://a.com/5'
      }
    ])
    if (result.blocked) throw new Error('Blocked')
    ok(result.posts[0]!.full.includes(TEXT))
    equal(result.posts[0]!.intro, 'Intro')
    equal(result.posts[1]!.full, 'Feed 2')
    equal(result.posts[1]!.intro, undefined)
    equal(result.posts[2]!.full, 'Feed 3')
    ok(result.posts[3]!.full.includes(TEXT))
    equal(result.posts[3]!.intro, 'Feed 4')
    deepEqual(result.posts[3]!.media, [
      { alt: 'A', fromText: true, type: 'image', url: 'https://a.com/a.png' }
    ])
    deepEqual(result.posts[4]!.media, [
      { type: 'image', url: 'https://a.com/feed.png' }
    ])
    deepEqual(result.posts[0]!.media, [])
    equal(result.errors.length, 1)
    ok(HTTPStatusError.is(result.errors[0], [500]))
  })

  test('stops on aborted task', async () => {
    let task = createDownloadTask()
    let robots = expectRequest('https://a.com/robots.txt').andWait()
    let checking = isAllowedByRobots(task, ['https://a.com/1'])
    task.destroy()
    equal(robots.aborted, true)
    let error = await throws(() => checking)
    equal(error.name, 'AbortError')
    deepEqual(robotsRecords.get(), {})
  })

  test('tells about blocked site', async () => {
    expectRequest('https://a.com/robots.txt').andRespond(
      200,
      'User-agent: *\nDisallow: /\n',
      'text/plain'
    )
    deepEqual(
      await addFullTexts(createDownloadTask(), [
        { full: 'Feed', id: '1', originId: '1', url: 'https://a.com/1' }
      ]),
      { blocked: true }
    )
  })
})
