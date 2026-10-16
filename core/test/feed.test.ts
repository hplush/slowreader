import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addFeed,
  deleteFeed,
  loadFeed,
  testFeed,
  updateFeedAvatar
} from '../index.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectRequest,
  mockRequest,
  setupNodeDom,
  startClient
} from './utils.ts'

setupNodeDom()

describe('feed', () => {
  beforeEach(() => {
    mockRequest()
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  function expectIcon(url: string): void {
    expectRequest(url).andRespond(200, 'IMAGE', 'image/png')
  }

  async function getAvatar(feedId: string): Promise<null | string | undefined> {
    return (await loadFeed(feedId))?.avatar
  }

  test('takes avatar from the feed', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'rss', url: 'https://a.com/blog/rss' })
    )
    expectRequest('https://a.com/blog/rss').andRespond(
      200,
      '<rss><channel><image><url>logo.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    expectIcon('https://a.com/blog/logo.png')
    await updateFeedAvatar(feedId)
    equal(await getAvatar(feedId), 'https://a.com/blog/logo.png')

    await updateFeedAvatar(feedId)
  })

  test('prefers SVG icon from the site', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'rss', url: 'https://a.com/blog/rss' })
    )
    expectRequest('https://a.com/blog/rss').andRespond(
      200,
      '<rss><channel></channel></rss>',
      'application/rss+xml'
    )
    expectRequest('https://a.com/').andRespond(
      200,
      '<!DOCTYPE html><html><head>' +
        '<link rel="apple-touch-icon" href="/apple.png">' +
        '<link rel="shortcut icon" href="/icon.png">' +
        '<link rel="icon" href="/icon.svg?v=1">' +
        '</head></html>'
    )
    expectIcon('https://a.com/icon.svg?v=1')
    await updateFeedAvatar(feedId)
    equal(await getAvatar(feedId), 'https://a.com/icon.svg?v=1')
  })

  test('picks the smallest sharp icon', async () => {
    let cases: [string, string][] = [
      [
        '<link rel="icon" sizes="16x16" href="/16.png">' +
          '<link rel="icon" sizes="192x192" href="/192.png">' +
          '<link rel="icon" sizes="512x512" href="/512.png">' +
          '<link rel="icon" sizes="152x152" href="/152.png">',
        '/152.png'
      ],
      [
        '<link rel="icon" sizes="16x16" href="/16.png">' +
          '<link rel="icon" sizes="32x32 48x48" href="/48.png">',
        '/48.png'
      ],
      [
        '<link rel="icon" sizes="512x512" href="/512.png">' +
          '<link rel="icon" sizes="any" href="/any.ico">',
        '/any.ico'
      ],
      [
        '<link rel="icon" href="/unknown.png">' +
          '<link rel="apple-touch-icon" href="/apple.png">',
        '/apple.png'
      ],
      [
        '<link rel="icon" href="/first.png">' +
          '<link rel="icon" sizes="wrong" href="/second.png">',
        '/first.png'
      ]
    ]
    for (let [index, [html, avatar]] of cases.entries()) {
      let feedId = await addFeed(
        testFeed({ loader: 'rss', url: `https://${index}.com/rss` })
      )
      expectRequest(`https://${index}.com/rss`).andRespond(404)
      expectRequest(`https://${index}.com/`).andRespond(
        200,
        `<!DOCTYPE html><html><head>${html}</head></html>`
      )
      expectIcon(`https://${index}.com${avatar}`)
      await updateFeedAvatar(feedId)
      equal(await getAvatar(feedId), `https://${index}.com${avatar}`)
    }
  })

  test('skips icons, which can’t be loaded', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'rss', url: 'https://a.com/feed/' })
    )
    expectRequest('https://a.com/feed/').andRespond(
      200,
      '<rss><channel><image><url>/logo.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    expectRequest('https://a.com/logo.png').andRespond(404)
    expectRequest('https://a.com/').andRespond(
      200,
      '<!DOCTYPE html><html><head>' +
        '<link rel="icon" sizes="96x96" href="/96.png">' +
        '<link rel="icon" sizes="32x32" href="/32.png">' +
        '<link rel="icon" type="image/svg+xml" href="/icon.svg">' +
        '<link rel="apple-touch-icon" sizes="152x152" href="/apple.png">' +
        '</head></html>'
    )
    expectRequest('https://a.com/icon.svg').andRespond(404)
    expectRequest('https://a.com/apple.png').andRespond(200, '<html>')
    expectRequest('https://a.com/96.png').andFail()
    expectIcon('https://a.com/32.png')
    await updateFeedAvatar(feedId)
    equal(await getAvatar(feedId), 'https://a.com/32.png')
  })

  test('falls back to favicon.ico', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'atom', url: 'https://a.com/atom' })
    )
    expectRequest('https://a.com/atom').andFail()
    expectRequest('https://a.com/').andRespond(
      200,
      '<!DOCTYPE html><html><head><link rel="icon" href=""></head></html>'
    )
    expectRequest('https://a.com/favicon.ico').andRespond(
      200,
      'ICO',
      'image/x-icon'
    )
    await updateFeedAvatar(feedId)
    equal(await getAvatar(feedId), 'https://a.com/favicon.ico')
  })

  test('removes missed avatar', async () => {
    let feedId = await addFeed(
      testFeed({
        avatar: 'https://a.com/old.png',
        loader: 'jsonFeed',
        url: 'https://a.com/feed.json'
      })
    )
    expectRequest('https://a.com/feed.json').andRespond(404)
    expectRequest('https://a.com/').andRespond(404)
    expectRequest('https://a.com/favicon.ico').andRespond(200, '<html>')
    await updateFeedAvatar(feedId)
    equal(await getAvatar(feedId), null)
  })

  test('ignores deleted feed', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'rss', url: 'https://a.com/rss' })
    )
    let reply = expectRequest('https://a.com/rss').andWait()
    expectIcon('https://a.com/a.png')
    let updating = updateFeedAvatar(feedId)
    await deleteFeed(feedId)
    await reply(
      200,
      '<rss><channel><image><url>/a.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    await updating
    equal(await loadFeed(feedId), undefined)

    await updateFeedAvatar('unknown')
  })
})
