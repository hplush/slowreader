import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addFeed,
  addPost,
  changeRead,
  loadPosts,
  testAccount,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { cleanClient, openPage, setTestUser, startClient } from '../utils.ts'

describe('history page', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('shows posts read in the last day', async () => {
    let now = Math.round(Date.now() / 1000)
    let feedId = await addFeed(testFeed({ title: 'Blog' }))
    let accountId = await addAccount(testAccount())

    let page = openPage({ params: {}, route: 'history' })
    equal(page.loading.get(), true)
    await waitLoading(page.loading)
    deepEqual(page.posts.get(), [])
    equal(page.hasMore.get(), false)

    await addPost([
      testPost({ feedId, id: 'unread' }),
      testPost({ feedId, id: 'old', read: 2, readAt: now - 90_000 }),
      testPost({
        feedId,
        id: 'left',
        intro: 'Intro',
        originId: 'a',
        publishedAt: 10,
        read: 2,
        readAt: now - 3600,
        title: 'Title',
        url: 'https://example.com/a'
      }),
      testPost({ feedId, merged: true, read: 2, readAt: now - 3600 }),
      testPost({
        accountId,
        author: { title: 'Alice' },
        feedId: null,
        full: '<p>Text</p>',
        id: 'shown',
        intro: '',
        originId: 'b',
        publishedAt: 20,
        read: 1,
        readAt: now - 60,
        reading: 'slow',
        url: null
      })
    ])
    await setTimeout(10)
    deepEqual(page.posts.get(), [
      {
        feedId: null,
        feedTitle: 'Alice',
        full: '<p>Text</p>',
        id: 'shown',
        intro: null,
        originId: 'b',
        publishedAt: 20,
        reading: 'slow',
        title: null,
        url: null
      },
      {
        feedId,
        feedTitle: 'Blog',
        full: null,
        id: 'left',
        intro: 'Intro',
        originId: 'a',
        publishedAt: 10,
        reading: 'fast',
        title: 'Title',
        url: 'https://example.com/a'
      }
    ])

    await changeRead(['left'], false)
    await setTimeout(10)
    deepEqual(
      page.posts.get().map(post => post.id),
      ['shown']
    )

    await changeRead(['unread'], true)
    await setTimeout(10)
    deepEqual(
      page.posts.get().map(post => post.id),
      ['unread', 'shown']
    )

    setTestUser(false)
    deepEqual(
      page.posts.get().map(post => post.id),
      ['unread', 'shown']
    )
  })

  test('shows more posts by request', async () => {
    let now = Math.round(Date.now() / 1000)
    let feedId = await addFeed(testFeed())
    await addPost(
      Array.from({ length: 60 }, (_, i) => {
        return testPost({ feedId, read: 2, readAt: now - i, title: `${i}` })
      })
    )

    let page = openPage({ params: {}, route: 'history' })
    await waitLoading(page.loading)
    equal(page.posts.get().length, 50)
    equal(page.posts.get()[0]!.title, '0')
    equal(page.hasMore.get(), true)

    page.showMore()
    await setTimeout(10)
    equal(page.posts.get().length, 60)
    equal(page.posts.get()[59]!.title, '59')
    equal(page.hasMore.get(), false)
  })

  test('clears history', async () => {
    let now = Math.round(Date.now() / 1000)
    let feedId = await addFeed(testFeed())
    await addPost([
      testPost({ feedId, id: 'left', read: 2, readAt: now - 60 }),
      testPost({ feedId, id: 'shown', read: 1, readAt: now }),
      testPost({ feedId, id: 'unread', readAt: now })
    ])
    let page = openPage({ params: {}, route: 'history' })
    await waitLoading(page.loading)
    equal(page.posts.get().length, 2)

    let clearing = page.clear()
    equal(page.clearing.get(), true)
    await clearing
    equal(page.clearing.get(), false)
    await setTimeout(10)
    deepEqual(page.posts.get(), [])
    deepEqual(
      (await loadPosts()).map(post => post.id),
      ['unread']
    )
  })
})
