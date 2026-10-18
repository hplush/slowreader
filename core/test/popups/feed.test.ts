import { keepMount } from 'nanostores'
import { deepEqual, equal, match, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  changeFeed,
  closeLastPopup,
  GENERAL_CATEGORY,
  getPopupId,
  HTTPStatusError,
  loadFeed,
  loadPostsByFeed,
  openedPopups,
  testFeed,
  waitLoading
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  checkLoadedPopup,
  cleanClient,
  startClient,
  expectRequest,
  expectWarning,
  getPopup,
  mockRequest,
  openTestPopup,
  openRoute,
  setupNodeDom,
  waitUntil
} from '../utils.ts'

setupNodeDom()

describe('feed popup', () => {
  beforeEach(() => {
    startClient()
    openRoute({ params: {}, route: 'add' })
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  test('loads 404 for feeds by URL popup', async () => {
    expectRequest('http://a.com/one').andRespond(404)
    await expectWarning(async () => {
      let feed1Popup = openTestPopup('feed', 'http://a.com/one')
      equal(openedPopups.get().length, 1)
      equal(feed1Popup.name, 'feed')
      equal(feed1Popup.param, 'http://a.com/one')
      equal(feed1Popup.loading.get(), true)

      await waitLoading(feed1Popup.loading)
      equal(feed1Popup.notFound, true)
    }, [])

    closeLastPopup()
    equal(openedPopups.get().length, 0)

    expectRequest('http://a.com/two').andRespond(200, '<html>Nothing</html>')
    let feed2Popup = openTestPopup('feed', 'http://a.com/two')
    equal(openedPopups.get().length, 1)
    equal(feed2Popup.param, 'http://a.com/two')
    equal(feed2Popup.loading.get(), true)

    await waitLoading(feed2Popup.loading)
    equal(feed2Popup.notFound, true)
  })

  test('survives not URL in the popup param', async () => {
    expectRequest('not-url').andRespond(404)
    await expectWarning(async () => {
      let popup = openTestPopup('feed', 'not-url')
      await waitLoading(popup.loading)
      equal(popup.notFound, true)
    }, [])
  })

  test('loads existing feed popup on 404', async () => {
    let feedId = await addFeed(testFeed({ url: 'http://a.com/404' }))
    expectRequest('http://a.com/404').andRespond(404)
    await expectWarning(async () => {
      let popup = openTestPopup('feed', 'http://a.com/404')
      equal(openedPopups.get().length, 1)
      equal(popup.loading.get(), true)
      await waitLoading(popup.loading)
      equal(popup.notFound, false)
      equal(checkLoadedPopup(popup).feed.get()?.id, feedId)
      deepEqual(checkLoadedPopup(popup).posts.get().isLoading, true)
      await checkLoadedPopup(popup).posts.loading
      deepEqual(checkLoadedPopup(popup).posts.get().isLoading, false)
      deepEqual(checkLoadedPopup(popup).posts.get().list.length, 0)
      equal(
        HTTPStatusError.is(checkLoadedPopup(popup).posts.get().error, [404]),
        true
      )
    }, [])
  })

  test('shows existing feed before posts are loaded', async () => {
    let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<link rel="next" href="https://a.com/atom?page=2" />' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).feed.get()?.id, feedId)
    equal(checkLoadedPopup(popup).posts.get().isLoading, true)

    await checkLoadedPopup(popup).posts.loading
    equal(checkLoadedPopup(popup).posts.get().isLoading, false)
    equal(checkLoadedPopup(popup).posts.get().hasNext, true)
    deepEqual(checkLoadedPopup(popup).posts.get().list[0]?.originId, '2')

    expectRequest('https://a.com/atom?page=2').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    await checkLoadedPopup(popup).posts.next()
    equal(checkLoadedPopup(popup).posts.get().hasNext, false)
    deepEqual(checkLoadedPopup(popup).posts.get().list[0]?.originId, '1')

    await checkLoadedPopup(popup).remove()
    equal(checkLoadedPopup(popup).feed.get(), undefined)
    let addedId = await checkLoadedPopup(popup).add()
    equal(checkLoadedPopup(popup).feed.get()?.id, addedId)
  })

  test('loads feeds by URL popup', async () => {
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/atom')
    equal(openedPopups.get().length, 1)
    equal(popup.loading.get(), true)

    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).feed.get(), undefined)
    equal(checkLoadedPopup(popup).title, 'Atom')
    deepEqual(checkLoadedPopup(popup).posts.get().isLoading, false)
    deepEqual(checkLoadedPopup(popup).posts.get().list.length, 2)
    deepEqual(checkLoadedPopup(popup).posts.get().list[0]?.originId, '2')

    deepEqual(checkLoadedPopup(popup).categories.get(), [
      [GENERAL_CATEGORY, 'General'],
      ['new', 'Add category…']
    ])

    let id = await addCategory({ title: 'Test' })
    deepEqual(checkLoadedPopup(popup).categories.get(), [
      [GENERAL_CATEGORY, 'General'],
      [id, 'Test'],
      ['new', 'Add category…']
    ])

    let addedId = await checkLoadedPopup(popup).add()
    let feedId = checkLoadedPopup(popup).feed.get()!.id
    equal(addedId, feedId)
    equal(checkLoadedPopup(popup).feed.get()!.url, 'https://a.com/atom')
    equal(checkLoadedPopup(popup).feed.get()!.title, 'Atom')
    equal((await loadFeed(feedId))!.title, 'Atom')
    equal((await loadFeed(feedId))!.lastOriginId, '2')
    equal((await loadFeed(feedId))!.lastPublishedAt, 1688169600)

    await changeFeed(feedId, { title: 'Test Atom' })
    equal(checkLoadedPopup(popup).feed.get()!.title, 'Test Atom')

    let posts = await loadPostsByFeed(feedId)
    deepEqual(
      posts.map(post => [post.originId, post.reading]),
      [
        ['2', 'slow'],
        ['1', 'slow']
      ]
    )

    await checkLoadedPopup(popup).remove()
    equal(checkLoadedPopup(popup).feed.get(), undefined)
    deepEqual(await loadPostsByFeed(feedId), [])
  })

  test('finds avatar of unsubscribed feed', async () => {
    expectRequest('https://a.com/rss').andRespond(
      200,
      '<rss><channel><title>RSS</title>' +
        '<image><url>logo.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/rss')
    await waitLoading(popup.loading)

    expectRequest('https://a.com/logo.png').andRespond(
      200,
      'IMAGE',
      'image/png'
    )
    keepMount(checkLoadedPopup(popup).avatar)
    await waitUntil(() => !!checkLoadedPopup(popup).avatar.get())
    equal(checkLoadedPopup(popup).avatar.get(), 'https://a.com/logo.png')

    let feedId = await checkLoadedPopup(popup).add()
    equal((await loadFeed(feedId!))!.avatar, 'https://a.com/logo.png')
  })

  test('updates avatar of subscribed feed', async () => {
    let feedId = await addFeed(
      testFeed({ avatar: 'https://a.com/old.png', url: 'https://a.com/rss' })
    )
    expectRequest('https://a.com/rss').andRespond(
      200,
      '<rss><channel><title>RSS</title>' +
        '<image><url>new.png</url></image></channel></rss>',
      'application/rss+xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/rss')
    await waitLoading(popup.loading)

    expectRequest('https://a.com/new.png').andRespond(200, 'IMAGE', 'image/png')
    keepMount(checkLoadedPopup(popup).avatar)
    await waitUntil(
      async () => (await loadFeed(feedId))?.avatar === 'https://a.com/new.png'
    )
    equal(checkLoadedPopup(popup).avatar.get(), 'https://a.com/new.png')
  })

  test('finds existing feed by normalized URL', async () => {
    let feedId = await addFeed(
      testFeed({ loader: 'mastodon', url: 'https://mastodon.social/@jane' })
    )
    expectRequest('https://mastodon.social/@Jane/').andRespond(
      200,
      '<!DOCTYPE html><html><head>' +
        '<meta content="Jane (@jane@mastodon.social)" property="og:title">' +
        '</head></html>'
    )
    let popup = openTestPopup('feed', 'https://mastodon.social/@Jane/')
    await waitLoading(popup.loading)
    equal(checkLoadedPopup(popup).feed.get()?.id, feedId)
  })

  test('adds only 10 latest posts with a feed', async () => {
    let entries = ''
    for (let i = 12; i > 0; i--) {
      entries +=
        `<entry><id>${i}</id>` +
        `<updated>2023-07-${String(i).padStart(2, '0')}T00:00:00Z</updated>` +
        '</entry>'
    }
    expectRequest('https://a.com/atom').andRespond(
      200,
      `<feed><title>Atom</title>${entries}</feed>`,
      'text/xml'
    )
    let popup = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup.loading)

    let feedId = await checkLoadedPopup(popup).add()
    let posts = await loadPostsByFeed(feedId!)
    deepEqual(
      posts.map(post => post.originId),
      ['12', '11', '10', '9', '8', '7', '6', '5', '4', '3']
    )
  })

  test('destroys replaced popups and keep unchanged', async () => {
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )

    openRoute({
      hash: `feed=https://a.com/atom,feed=https://a.com/atom`,
      params: {},
      route: 'add'
    })
    equal(openedPopups.get().length, 2)
    let popup1 = getPopup('feed', 0)
    let popup2 = getPopup('feed', 1)
    await waitLoading(popup1.loading)
    equal(checkLoadedPopup(popup1).feed.get(), undefined)
    equal(checkLoadedPopup(popup2).feed.get(), undefined)

    let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
    equal(checkLoadedPopup(popup1).feed.get()!.url, 'https://a.com/atom')
    equal(checkLoadedPopup(popup1).feed.get()?.id, feedId)
    equal(checkLoadedPopup(popup2).feed.get()?.id, feedId)

    closeLastPopup()
    deepEqual(openedPopups.get(), [popup1])

    await checkLoadedPopup(popup1).remove()
    equal(checkLoadedPopup(popup1).feed.get(), undefined)
    equal(checkLoadedPopup(popup2).feed.get()?.id, feedId)
  })

  test('has helpers to generate popup ID', () => {
    match(getPopupId('feed', 'https://example.com/'), /^[a-z_-]+$/)
    equal(
      getPopupId('feed', 'https://example.com/'),
      getPopupId('feed', 'https://example.com/')
    )
    notEqual(
      getPopupId('feed', 'https://example.com/'),
      getPopupId('feed', 'http://example.com/')
    )
  })

  test('ignores url protocol while checking for existing feeds', async () => {
    expectRequest('http://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup = openTestPopup('feed', 'http://a.com/atom')
    await waitLoading(popup.loading)

    let addedId = await checkLoadedPopup(popup).add()
    let feedId = checkLoadedPopup(popup).feed.get()!.id
    equal(addedId, feedId)
    equal((await loadFeed(feedId))!.url, 'http://a.com/atom')

    expectRequest('https://a.com/atom').andRespond(
      200,
      '<feed><title>Atom</title>' +
        '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
        '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
        '</feed>',
      'text/xml'
    )
    let popup2 = openTestPopup('feed', 'https://a.com/atom')
    await waitLoading(popup2.loading)
    equal(checkLoadedPopup(popup2).feed.get()!.url, 'http://a.com/atom')
  })
})
