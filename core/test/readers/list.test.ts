import { keepMount } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  changePost,
  slowMenu,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  ensureReader,
  openPage
} from '../utils.ts'

describe('list reader', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('loads posts', async () => {
    keepMount(slowMenu)
    let categoryId = await addCategory({ slowReader: 'list', title: 'A' })
    let feed1 = await addFeed(
      testFeed({ categoryId, slowReader: 'list', title: 'Feed 1' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId, slowReader: 'list', title: 'Feed 2' })
    )
    for (let i = 1; i <= 150; i++) {
      await addPost(
        testPost({
          feedId: i % 2 === 0 ? feed1 : feed2,
          publishedAt: i,
          reading: 'slow',
          title: `${i}`
        })
      )
    }

    deepEqual(slowMenu.get(), [
      [
        { id: categoryId, title: 'A' },
        [
          [{ id: feed1, title: 'Feed 1' }, 75],
          [{ id: feed2, title: 'Feed 2' }, 75]
        ]
      ]
    ])
    let page = openPage({
      params: { feed: feed1 },
      route: 'slow'
    })
    equal(page.loading.get(), true)
    await waitLoading(page.loading)
    let reader = ensureReader(page.posts, 'list')
    equal(reader.list.get().length, 75)
    equal(reader.list.get()[0]!.title, '150')
    deepEqual(reader.pages.get(), {
      count: 1,
      hasNext: false,
      page: 0,
      pages: [0],
      show: false
    })

    page = openPage({
      params: { category: categoryId },
      route: 'slow'
    })
    equal(page.loading.get(), false)
    equal(page.postsLoading.get(), true)
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'list')
    equal(reader.list.get().length, 100)
    equal(reader.list.get()[0]!.title, '150')
    equal(reader.list.get()[99]!.title, '51')
    deepEqual(reader.pages.get(), {
      count: 2,
      hasNext: true,
      page: 0,
      pages: [0, 1],
      show: true
    })

    await changePost(reader.list.get()[0]!.id, { read: 1 })
    await changePost(reader.list.get()[5]!.id, { read: 1 })
    equal(reader.list.get().length, 100)
    deepEqual(slowMenu.get(), [
      [
        { id: categoryId, title: 'A' },
        [
          [{ id: feed1, title: 'Feed 1' }, 74],
          [{ id: feed2, title: 'Feed 2' }, 74]
        ]
      ]
    ])

    page.params.from.set(1)
    equal(reader.list.get().length, 50)
    equal(reader.list.get()[0]!.title, '50')
    deepEqual(reader.pages.get(), {
      count: 2,
      hasNext: false,
      page: 1,
      pages: [0, 1],
      show: true
    })
    await setTimeout(10)

    openPage({
      params: { feed: feed1 },
      route: 'slow'
    })
    await setTimeout(10)

    page = openPage({
      params: { category: categoryId, from: 1 },
      route: 'slow'
    })
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'list')
    equal(reader.list.get().length, 48)

    page.params.from.set(0)
    equal(reader.list.get()[99]!.title, '49')

    await reader.readPage()
    equal(page.params.from.get(), 1)
    equal(reader.list.get().length, 48)
    deepEqual(reader.pages.get(), {
      count: 2,
      hasNext: false,
      page: 1,
      pages: [0, 1],
      show: true
    })
    await setTimeout(10)
    deepEqual(slowMenu.get(), [
      [
        { id: categoryId, title: 'A' },
        [
          [{ id: feed1, title: 'Feed 1' }, 24],
          [{ id: feed2, title: 'Feed 2' }, 24]
        ]
      ]
    ])

    await reader.readPage()
    equal(page.params.from.get(), 1)
    equal(reader.list.get().length, 48)
    deepEqual(reader.pages.get(), {
      count: 2,
      hasNext: false,
      page: 1,
      pages: [0, 1],
      show: true
    })

    openPage({
      params: { feed: feed1 },
      route: 'slow'
    })
    await setTimeout(10)
    page = openPage({
      params: { category: categoryId },
      route: 'slow'
    })
    await setTimeout(10)
    equal(page.posts.get()?.name, 'empty')
  })
})
