import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  openPopup,
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

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('loads posts', async () => {
  let categoryId = await addCategory({ title: 'A' })
  let feed1 = await addFeed(testFeed({ categoryId }))
  let feed2 = await addFeed(testFeed({ categoryId }))
  for (let i = 1; i <= 150; i++) {
    await addPost(
      testPost({
        feedId: i % 2 === 0 ? feed1 : feed2,
        publishedAt: i,
        reading: 'fast',
        title: `${i}`
      })
    )
  }

  let page = openPage({
    params: { feed: feed1, reader: 'list' },
    route: 'fast'
  })
  equal(page.loading.get(), true)
  await waitLoading(page.loading)
  let reader = ensureReader(page.posts, 'list')
  equal(reader.list.get().length, 75)
  equal(reader.list.get()[0]!.title, '150')
  deepStrictEqual(reader.pages.get(), {
    count: 1,
    hasNext: false,
    page: 0,
    show: false
  })

  page = openPage({
    params: { category: categoryId, reader: 'list' },
    route: 'fast'
  })
  equal(page.loading.get(), true)
  await waitLoading(page.loading)
  reader = ensureReader(page.posts, 'list')
  equal(reader.list.get().length, 100)
  equal(reader.list.get()[0]!.title, '150')
  equal(reader.list.get()[99]!.title, '51')
  deepStrictEqual([...reader.read.get()], [])
  deepStrictEqual(reader.pages.get(), {
    count: 2,
    hasNext: true,
    page: 0,
    show: true
  })

  let post0 = reader.list.get()[0]!.id
  openPopup('post', post0)
  deepStrictEqual([...reader.read.get()], [post0])

  let post5 = reader.list.get()[5]!.id
  openPopup('post', post5)
  deepStrictEqual([...reader.read.get()], [post0, post5])
  equal(reader.list.get().length, 100)

  page.params.since.set(1)
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.title, '50')
  deepStrictEqual([...reader.read.get()], [post0, post5])
  deepStrictEqual(reader.pages.get(), {
    count: 2,
    hasNext: false,
    page: 1,
    show: true
  })
  await setTimeout(10)

  openPage({
    params: { feed: feed1, reader: 'list' },
    route: 'fast'
  })

  page = openPage({
    params: { category: categoryId, reader: 'list', since: 1 },
    route: 'fast'
  })
  reader = ensureReader(page.posts, 'list')
  await waitLoading(page.loading)
  equal(reader.read.get().size, 0)
  equal(reader.list.get().length, 48)

  page.params.since.set(0)
  equal(reader.list.get()[99]!.title, '49')

  await reader.readPage()
  equal(page.params.since.get(), 1)
  equal(reader.list.get().length, 48)
  equal(reader.read.get().size, 100)
  deepStrictEqual(reader.pages.get(), {
    count: 2,
    hasNext: false,
    page: 1,
    show: true
  })

  await reader.readPage()
  equal(page.params.since.get(), 1)
  equal(reader.list.get().length, 48)
  equal(reader.read.get().size, 148)
  deepStrictEqual(reader.pages.get(), {
    count: 2,
    hasNext: false,
    page: 1,
    show: true
  })

  openPage({
    params: { feed: feed1, reader: 'list' },
    route: 'fast'
  })
  page = openPage({
    params: { category: categoryId, reader: 'list' },
    route: 'fast'
  })
  reader = ensureReader(page.posts, 'list')
  await waitLoading(page.loading)
  equal(reader.list.get().length, 0)
  deepStrictEqual(reader.pages.get(), {
    count: 0,
    hasNext: false,
    page: 0,
    show: false
  })
})
