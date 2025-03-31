import '../dom-parser.ts'

import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  changeFeed,
  checkAndRemoveRequestMock,
  deleteFeed,
  expectRequest,
  type FeedUrlPopup,
  mockRequest,
  openedPopups,
  setBaseTestRoute,
  testFeed,
  waitForStore
} from '../../index.ts'
import { cleanClientTest, enableClientTest } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
  mockRequest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(openedPopups)
  checkAndRemoveRequestMock()
})

test('loads 404 for feeds by URL popup', async () => {
  keepMount(openedPopups)
  expectRequest('http://a.com/one').andRespond(404)
  setBaseTestRoute({
    hash: `feedUrl=http://a.com/one`,
    params: {},
    route: 'add'
  })
  equal(openedPopups.get().length, 1)
  equal(openedPopups.get()[0]?.name, 'feedUrl')
  equal(openedPopups.get()[0]?.param, 'http://a.com/one')
  equal(openedPopups.get()[0]?.loading.get(), true)

  await waitForStore((openedPopups.get()[0] as FeedUrlPopup).loading, false)
  equal(openedPopups.get()[0]?.notFound, true)

  expectRequest('http://a.com/two').andRespond(200, '<html>Nothing</html>')
  setBaseTestRoute({
    hash: `feedUrl=http://a.com/two`,
    params: {},
    route: 'add'
  })
  equal(openedPopups.get()[0]?.param, 'http://a.com/two')
  equal(openedPopups.get()[0]?.loading.get(), true)

  await waitForStore((openedPopups.get()[0] as FeedUrlPopup).loading, false)
  equal(openedPopups.get()[0]?.notFound, true)
})

test('loads feeds by URL popup', async () => {
  keepMount(openedPopups)
  expectRequest('https://a.com/atom').andRespond(
    200,
    '<feed><title>Atom</title>' +
      '<entry><id>2</id><updated>2023-07-01T00:00:00Z</updated></entry>' +
      '<entry><id>1</id><updated>2023-06-01T00:00:00Z</updated></entry>' +
      '</feed>',
    'text/xml'
  )
  setBaseTestRoute({
    hash: `feedUrl=https://a.com/atom`,
    params: {},
    route: 'add'
  })
  equal(openedPopups.get().length, 1)
  equal(openedPopups.get()[0]?.loading.get(), true)

  let feedPopup = openedPopups.get()[0] as FeedUrlPopup
  await waitForStore(feedPopup.loading, false)
  equal(feedPopup.notFound, false)
  equal(feedPopup.feed.get(), undefined)
  deepStrictEqual(feedPopup.posts.get().isLoading, false)
  deepStrictEqual(feedPopup.posts.get().list.length, 2)
  deepStrictEqual(feedPopup.posts.get().list[0]?.originId, '2')

  let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
  equal(feedPopup.feed.get()!.url, 'https://a.com/atom')
  equal(feedPopup.feed.get()!.id, feedId)
  equal(feedPopup.feed.get()!.title, 'Test 1')

  await changeFeed(feedId, { title: 'New Test 1' })
  equal(feedPopup.feed.get()!.title, 'New Test 1')

  await deleteFeed(feedId)
  equal(feedPopup.feed.get(), undefined)
})

test('destroys replaced popups and keep unchanged', async () => {
  keepMount(openedPopups)
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

  setBaseTestRoute({
    hash: `feedUrl=https://a.com/atom,feedUrl=https://a.com/atom`,
    params: {},
    route: 'add'
  })
  equal(openedPopups.get().length, 2)
  let feedPopup1 = openedPopups.get()[0] as FeedUrlPopup
  let feedPopup2 = openedPopups.get()[1] as FeedUrlPopup
  await waitForStore(feedPopup1.loading, false)
  equal(feedPopup1.feed.get(), undefined)
  equal(feedPopup2.feed.get(), undefined)

  let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
  equal(feedPopup1.feed.get()!.url, 'https://a.com/atom')
  equal(feedPopup1.feed.get()?.id, feedId)
  equal(feedPopup2.feed.get()?.id, feedId)

  setBaseTestRoute({
    hash: `feedUrl=https://a.com/atom`,
    params: {},
    route: 'add'
  })
  deepStrictEqual(openedPopups.get(), [feedPopup1])

  await deleteFeed(feedId)
  equal(feedPopup1.feed.get(), undefined)
  equal(feedPopup2.feed.get()?.id, feedId)
})
