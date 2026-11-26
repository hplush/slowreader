import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  busy,
  busyUntilMenuLoader,
  changeRead,
  loadPost,
  moveToLater,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { cleanClient, openPage, startClient } from '../utils.ts'

describe('later page', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
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
    await changeRead(['old'], true)
    await setTimeout(10)
    deepEqual(
      page.posts.get().map(post => [post.id, post.read]),
      [
        ['feed', 0],
        ['old', 1]
      ]
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

    openPage({ params: {}, route: 'about' })
    await setTimeout(10)
    equal((await loadPost('old'))!.read, 2)
  })
})
