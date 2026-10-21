import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCandidate,
  addFeed,
  createPostsList,
  deleteFeed,
  getFeedLatestPosts,
  loadFeed,
  loaders,
  loadPosts,
  testFeed,
  updateFeedData
} from '../index.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectRequest,
  expectWarning,
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
    restoreAll()
    checkAndRemoveRequestMock()
  })

  function expectIcon(url: string): void {
    expectRequest(url).andRespond(200, 'IMAGE', 'image/png')
  }

  async function getAvatar(feedId: string): Promise<null | string | undefined> {
    return (await loadFeed(feedId))?.avatar
  }

  test('keeps loader data', async () => {
    let candidate = {
      loader: loaders.mastodon,
      name: 'mastodon' as const,
      title: 'Jane',
      url: 'https://mastodon.social/@jane'
    }
    let statuses =
      'https://mastodon.social/api/v1/accounts/1/statuses?exclude_replies=true'
    expectRequest(
      'https://mastodon.social/api/v1/accounts/lookup?acct=jane'
    ).andRespond(200, '{"id":"1"}', 'application/json')
    expectRequest(statuses).andRespond(200, '[]', 'application/json')
    let feed = await loadFeed(await addCandidate(candidate))
    equal(feed!.loaderData, '{"id":"1"}')

    expectRequest(statuses).andRespond(200, '[]', 'application/json')
    await getFeedLatestPosts(feed!).loading

    expectRequest(
      'https://mastodon.social/api/v1/accounts/lookup?acct=jane'
    ).andRespond(404)
    expectRequest(
      'https://mastodon.social/api/v1/accounts/lookup?acct=jane'
    ).andRespond(404)
    let broken = await loadFeed(await addCandidate(candidate))
    equal(broken!.loaderData, null)
  })

  test('counts thread as one post of new feed', async () => {
    spyOn(loaders.rss, 'getPosts', () => {
      return createPostsList(() => {
        return Promise.resolve([
          [
            { originId: 'start', publishedAt: 100 },
            { originId: 'part1', publishedAt: 50, selfReplyTo: 'start' },
            { originId: 'part2', publishedAt: 60, selfReplyTo: 'part1' },
            ...Array.from({ length: 10 }, (_, i) => ({
              originId: `post${i}`,
              publishedAt: 90 - i
            }))
          ],
          undefined
        ])
      })
    })
    await addCandidate({
      loader: loaders.rss,
      name: 'rss',
      title: 'Jane',
      url: 'https://a.com/rss'
    })
    deepEqual(
      Object.fromEntries(
        (await loadPosts()).map(post => [post.originId, post.threadId])
      ),
      {
        part1: 'start',
        part2: 'start',
        start: 'start',
        ...Object.fromEntries(
          Array.from({ length: 9 }, (_, i) => [`post${i}`, null])
        )
      }
    )
  })

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
    await updateFeedData(feedId)
    equal(await getAvatar(feedId), 'https://a.com/blog/logo.png')

    await updateFeedData(feedId)
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
    await updateFeedData(feedId)
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
      expectRequest(`https://${index}.com/rss`).andRespond(
        200,
        '<rss version="2.0"><channel></channel></rss>',
        'application/rss+xml'
      )
      expectRequest(`https://${index}.com/`).andRespond(
        200,
        `<!DOCTYPE html><html><head>${html}</head></html>`
      )
      expectIcon(`https://${index}.com${avatar}`)
      await updateFeedData(feedId)
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
    await updateFeedData(feedId)
    equal(await getAvatar(feedId), 'https://a.com/32.png')
  })

  test('falls back to favicon.ico', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'atom', url: 'https://a.com/atom' })
    )
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed xmlns="http://www.w3.org/2005/Atom"></feed>',
      'application/atom+xml'
    )
    expectRequest('https://a.com/').andRespond(
      200,
      '<!DOCTYPE html><html><head><link rel="icon" href=""></head></html>'
    )
    expectRequest('https://a.com/favicon.ico').andRespond(
      200,
      'ICO',
      'image/x-icon'
    )
    await updateFeedData(feedId)
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
    expectRequest('https://a.com/feed.json').andRespond(
      200,
      JSON.stringify({
        items: [],
        title: 'A',
        version: 'https://jsonfeed.org/version/1.1'
      }),
      'application/feed+json'
    )
    expectRequest('https://a.com/').andRespond(404)
    expectRequest('https://a.com/favicon.ico').andRespond(200, '<html>')
    await updateFeedData(feedId)
    equal(await getAvatar(feedId), null)
  })

  test('ignores deleted feed', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'rss', url: 'https://a.com/rss' })
    )
    let reply = expectRequest('https://a.com/rss').andWait()
    expectIcon('https://a.com/a.png')
    let updating = updateFeedData(feedId)
    await deleteFeed(feedId)
    await reply(
      200,
      '<rss><channel><image><url>/a.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    await updating
    equal(await loadFeed(feedId), undefined)

    await updateFeedData('unknown')
  })

  test('updates feed data', async () => {
    let profile =
      'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile' +
      '?actor=user.bsky.social'
    function bluesky(title: string, originTitle: string): Promise<string> {
      return addFeed(
        testFeed({
          loader: 'bluesky',
          originTitle,
          title,
          url: 'https://bsky.app/profile/user.bsky.social'
        })
      )
    }
    function respondProfile(): void {
      expectRequest(profile).andRespond(
        200,
        JSON.stringify({
          avatar: 'https://cdn.bsky.app/user.jpg',
          did: 'did:plc:user',
          displayName: 'New',
          handle: 'user.bsky.social'
        }),
        'application/json'
      )
    }

    let followed = await bluesky('Old', 'Old')
    respondProfile()
    equal(await updateFeedData(followed), 'https://cdn.bsky.app/user.jpg')
    let feed = await loadFeed(followed)
    equal(feed?.title, 'New')
    equal(feed?.originTitle, 'New')
    equal(await updateFeedData(followed), 'https://cdn.bsky.app/user.jpg')

    let renamed = await bluesky('Mine', 'Old')
    respondProfile()
    await updateFeedData(renamed)
    feed = await loadFeed(renamed)
    equal(feed?.title, 'Mine')
    equal(feed?.originTitle, 'New')

    let failed = await bluesky('Old', 'Old')
    expectRequest(profile).andRespond(500)
    equal(await updateFeedData(failed), undefined)
    equal((await loadFeed(failed))?.title, 'Old')

    let broken = await addFeed(
      testFeed({ loader: 'bluesky', url: 'https://bsky.app/' })
    )
    await expectWarning(async () => {
      await updateFeedData(broken)
    }, [new TypeError("Cannot read properties of null (reading '1')")])
  })
})
