import '../dom-parser.ts'

import { loadValue } from '@logux/client'
import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  changeFeed,
  checkAndRemoveRequestMock,
  closeLastPopup,
  deleteFeed,
  expectRequest,
  getFeed,
  mockRequest,
  openedPopups,
  setBaseTestRoute,
  testFeed,
  waitLoading
} from '../../index.ts'
import {
  checkLoadedPopup,
  cleanClientTest,
  enableClientTest,
  getPopup,
  openTestPopup
} from '../utils.ts'

beforeEach(() => {
  enableClientTest()
  setBaseTestRoute({ params: {}, route: 'add' })
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
  let feed1Popup = openTestPopup('feedUrl', 'http://a.com/one')
  equal(openedPopups.get().length, 1)
  equal(feed1Popup.name, 'feedUrl')
  equal(feed1Popup.param, 'http://a.com/one')
  equal(feed1Popup.loading.get(), true)

  await waitLoading(feed1Popup.loading)
  equal(feed1Popup.notFound, true)

  closeLastPopup()
  equal(openedPopups.get().length, 0)

  expectRequest('http://a.com/two').andRespond(200, '<html>Nothing</html>')
  let feed2Popup = openTestPopup('feedUrl', 'http://a.com/two')
  equal(openedPopups.get().length, 1)
  equal(feed2Popup.param, 'http://a.com/two')
  equal(feed2Popup.loading.get(), true)

  await waitLoading(feed2Popup.loading)
  equal(feed2Popup.notFound, true)
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
  let popup = openTestPopup('feedUrl', 'https://a.com/atom')
  equal(openedPopups.get().length, 1)
  equal(popup.loading.get(), true)

  await waitLoading(popup.loading)
  equal(checkLoadedPopup(popup).feed.get(), undefined)
  deepStrictEqual(checkLoadedPopup(popup).posts.get().isLoading, false)
  deepStrictEqual(checkLoadedPopup(popup).posts.get().list.length, 2)
  deepStrictEqual(checkLoadedPopup(popup).posts.get().list[0]?.originId, '2')

  let addedId = await checkLoadedPopup(popup).add()
  let feedId = checkLoadedPopup(popup).feed.get()!.id
  equal(addedId, feedId)
  equal(checkLoadedPopup(popup).feed.get()!.url, 'https://a.com/atom')
  equal(checkLoadedPopup(popup).feed.get()!.title, 'Atom')
  equal((await loadValue(getFeed(feedId)))!.title, 'Atom')

  await changeFeed(feedId, { title: 'Test Atom' })
  equal(checkLoadedPopup(popup).feed.get()!.title, 'Test Atom')

  await deleteFeed(feedId)
  equal(checkLoadedPopup(popup).feed.get(), undefined)
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
  let popup1 = getPopup('feedUrl', 0)
  let popup2 = getPopup('feedUrl', 1)
  await waitLoading(popup1.loading)
  equal(checkLoadedPopup(popup1).feed.get(), undefined)
  equal(checkLoadedPopup(popup2).feed.get(), undefined)

  let feedId = await addFeed(testFeed({ url: 'https://a.com/atom' }))
  equal(checkLoadedPopup(popup1).feed.get()!.url, 'https://a.com/atom')
  equal(checkLoadedPopup(popup1).feed.get()?.id, feedId)
  equal(checkLoadedPopup(popup2).feed.get()?.id, feedId)

  closeLastPopup()
  deepStrictEqual(openedPopups.get(), [popup1])

  await deleteFeed(feedId)
  equal(checkLoadedPopup(popup1).feed.get(), undefined)
  equal(checkLoadedPopup(popup2).feed.get()?.id, feedId)
})
