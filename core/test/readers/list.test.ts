import { keepMount } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  changePost,
  deletePost,
  type ListReader,
  loadPostsByFeed,
  type Page,
  slowMenu,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  ensureReader,
  openPage,
  setBaseTestRoute
} from '../utils.ts'

async function moveTo(page: Page<'slow'>, from: number): Promise<void> {
  page.params.from.set(`${from}`)
  await waitLoading(page.postsLoading)
}

function titles(reader: ListReader): string[] {
  return reader.list.get().map(post => post.title!)
}

describe('list reader', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    // Without it the page of the test will be mounted during the next test
    setBaseTestRoute({ params: {}, route: 'about' })
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
      show: false,
      titles: true
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
      show: true,
      titles: true
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

    // Page cursors are taken on opening, so reading does not renumber pages
    await moveTo(page, 1)
    equal(reader.list.get().length, 50)
    equal(reader.list.get()[0]!.title, '50')
    deepEqual(reader.pages.get(), {
      count: 2,
      hasNext: false,
      page: 1,
      pages: [0, 1],
      show: true,
      titles: true
    })
    await setTimeout(10)

    openPage({
      params: { feed: feed1 },
      route: 'slow'
    })
    await setTimeout(10)

    page = openPage({
      params: { category: categoryId, from: '1' },
      route: 'slow'
    })
    await waitLoading(page.postsLoading)
    reader = ensureReader(page.posts, 'list')
    equal(reader.list.get().length, 48)

    await moveTo(page, 0)
    equal(reader.list.get()[99]!.title, '49')

    await reader.readPage()
    equal(page.params.from.get(), '1')
    await waitLoading(page.postsLoading)
    equal(reader.list.get().length, 48)
    deepEqual(reader.pages.get(), {
      count: 2,
      hasNext: false,
      page: 1,
      pages: [0, 1],
      show: true,
      titles: true
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
    equal(page.params.from.get(), '1')
    equal(reader.list.get().length, 48)
    deepEqual(reader.pages.get(), {
      count: 2,
      hasNext: false,
      page: 1,
      pages: [0, 1],
      show: true,
      titles: true
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

  test('does not skip posts changed by another client', async () => {
    let feedId = await addFeed(testFeed({ slowReader: 'list' }))
    for (let i = 1; i <= 250; i++) {
      await addPost(
        testPost({ feedId, publishedAt: i, reading: 'slow', title: `${i}` })
      )
    }

    let page = openPage({
      params: { feed: feedId },
      route: 'slow'
    })
    // Stores are unmounted with a delay, so `currentPage` of the previous
    // test is still mounted: the page was opened with the empty reader
    // of the empty database and `page.loading` is `false` since then
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'list')
    equal(reader.pages.get().count, 3)
    let shown = new Set(titles(reader))

    // Another tab or device reads and deletes posts of the next pages
    let ids = new Map(
      (await loadPostsByFeed(feedId)).map(post => [post.title!, post.id])
    )
    let read = ['150', '149', '148']
    let deleted = ['60', '59']
    await changePost(
      read.map(title => ids.get(title)!),
      { read: 1 }
    )
    await deletePost(deleted.map(title => ids.get(title)!))
    let removed = new Set([...read, ...deleted])

    for (let i = 1; i < reader.pages.get().count; i++) {
      await moveTo(page, i)
      for (let title of titles(reader)) shown.add(title)
    }

    for (let i = 1; i <= 250; i++) {
      let title = `${i}`
      if (removed.has(title)) continue
      equal(shown.has(title), true, `Post ${title} was skipped`)
    }
  })

  test('shows posts read on the open page', async () => {
    let feedId = await addFeed(testFeed({ slowReader: 'list' }))
    for (let i = 1; i <= 3; i++) {
      await addPost(
        testPost({ feedId, publishedAt: i, reading: 'slow', title: `${i}` })
      )
    }

    let page = openPage({ params: { feed: feedId }, route: 'slow' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'list')
    deepEqual(titles(reader), ['3', '2', '1'])

    await changePost(reader.list.get()[1]!.id, { read: 1 })
    await setTimeout(10)

    // The post stays on the page and only changes the style
    deepEqual(titles(reader), ['3', '2', '1'])
    deepEqual(
      reader.list.get().map(post => post.read),
      [0, 1, 0]
    )
  })

  test('splits posts of the same time between pages', async () => {
    let feedId = await addFeed(testFeed({ slowReader: 'list' }))
    for (let i = 1; i <= 250; i++) {
      await addPost(
        testPost({ feedId, publishedAt: 1, reading: 'slow', title: `${i}` })
      )
    }

    let page = openPage({ params: { feed: feedId }, route: 'slow' })
    await waitLoading(page.postsLoading)
    let reader = ensureReader(page.posts, 'list')
    equal(reader.pages.get().count, 3)

    let shown = new Set(titles(reader))
    for (let i = 1; i < reader.pages.get().count; i++) {
      await moveTo(page, i)
      for (let title of titles(reader)) shown.add(title)
    }
    equal(shown.size, 250)
  })
})
