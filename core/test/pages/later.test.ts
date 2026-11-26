import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  busy,
  busyUntilMenuLoader,
  deleteFromLater,
  laterMessages,
  loadPost,
  moveToLater,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  cleanClient,
  expectRequest,
  mockRequest,
  openPage,
  setTestClipboard,
  startClient
} from '../utils.ts'

describe('later page', () => {
  beforeEach(() => {
    startClient()
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    checkAndRemoveRequestMock()
  })

  test('shows live Read later posts', async () => {
    busyUntilMenuLoader()
    await waitLoading(busy)
    let feed = await addFeed(
      testFeed({ reading: 'slow', title: 'Feed', url: 'https://example.com/' })
    )
    let page = openPage({ params: {}, route: 'later' })
    await waitLoading(page.loading)
    deepEqual(page.posts.get(), [])

    await addPost([
      testPost({
        author: { loader: 'page', title: 'Site', url: 'https://site.com/' },
        feedId: null,
        id: 'old',
        later: 10,
        reading: 'slow'
      }),
      testPost({ feedId: feed, id: 'feed', reading: 'slow' })
    ])
    await setTimeout(10)
    deepEqual(
      page.posts.get().map(post => post.id),
      ['old']
    )

    await moveToLater((await loadPost('feed'))!)
    await setTimeout(10)
    deepEqual(
      page.posts.get().map(post => post.id),
      ['feed', 'old']
    )
    let saved = page.posts.get()[0]!
    equal(saved.author, null)
    equal(saved.feedId, feed)
    deepEqual(page.authors.get().get(feed), {
      avatar: null,
      feedId: feed,
      handle: 'example.com/',
      page: false,
      round: false,
      title: 'Feed',
      url: 'https://example.com/'
    })
    deepEqual(page.authors.get().get('old'), {
      avatar: null,
      feedId: 'old',
      handle: 'site.com/',
      page: true,
      round: false,
      title: 'Site',
      url: 'https://site.com/'
    })

    await deleteFromLater((await loadPost('old'))!)
    await setTimeout(10)
    deepEqual(
      page.posts.get().map(post => post.id),
      ['feed']
    )
  })

  test('adds link from clipboard', async () => {
    let page = openPage({ params: {}, route: 'later' })
    await waitLoading(page.loading)
    equal(page.pasteable.get(), true)

    await page.addFromClipboard()
    equal(page.failure.get(), laterMessages.get().noClipboard)

    setTestClipboard('a.com/1')
    let response = expectRequest('https://a.com/1').andWait()
    let adding = page.addFromClipboard()
    equal(page.adding.get(), true)
    equal(page.failure.get(), undefined)
    expectRequest('https://a.com/').andRespond(404)
    expectRequest('https://a.com/favicon.ico').andRespond(404)
    await response(200, '<html><head><title>One</title></head></html>')
    await adding
    equal(page.adding.get(), false)
    equal(page.added.get(), true)
    await setTimeout(10)
    deepEqual(
      page.posts.get().map(post => post.url),
      ['https://a.com/1']
    )

    await page.addFromClipboard()
    equal(page.added.get(), false)
    equal(page.already.get(), true)
  })
})
