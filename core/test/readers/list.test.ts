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

  let fast1 = openPage({
    params: { feed: feed1, reader: 'list' },
    route: 'fast'
  })
  equal(fast1.loading.get(), true)
  await waitLoading(fast1.loading)
  let reader1 = ensureReader(fast1.posts, 'list')
  equal(reader1.list.get().length, 75)
  equal(reader1.list.get()[0]!.title, '150')
  deepStrictEqual(reader1.pages.get(), {
    count: 1,
    hasNext: false,
    page: 0,
    show: false
  })

  let fast2 = openPage({
    params: { category: categoryId, reader: 'list' },
    route: 'fast'
  })
  equal(fast2.loading.get(), true)
  await waitLoading(fast2.loading)
  let reader2 = ensureReader(fast2.posts, 'list')
  equal(reader2.list.get().length, 100)
  equal(reader2.list.get()[0]!.title, '150')
  equal(reader2.list.get()[99]!.title, '51')
  deepStrictEqual([...reader2.read.get()], [])
  deepStrictEqual(reader2.pages.get(), {
    count: 2,
    hasNext: true,
    page: 0,
    show: true
  })

  let post0 = reader2.list.get()[0]!.id
  openPopup('post', post0)
  deepStrictEqual([...reader2.read.get()], [post0])

  let post5 = reader2.list.get()[5]!.id
  openPopup('post', post5)
  deepStrictEqual([...reader2.read.get()], [post0, post5])
  equal(reader2.list.get().length, 100)

  fast2.params.since.set(1)
  equal(reader2.list.get().length, 50)
  equal(reader2.list.get()[0]!.title, '50')
  deepStrictEqual([...reader2.read.get()], [post0, post5])
  deepStrictEqual(reader2.pages.get(), {
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

  let fast4 = openPage({
    params: { category: categoryId, reader: 'list', since: 1 },
    route: 'fast'
  })
  let reader4 = ensureReader(fast4.posts, 'list')
  await waitLoading(fast4.loading)
  equal(reader4.read.get().size, 0)
  equal(reader4.list.get().length, 48)

  fast4.params.since.set(0)
  equal(reader4.list.get()[99]!.title, '49')

  await reader4.readPage()
  equal(fast4.params.since.get(), 1)
  equal(reader4.list.get().length, 48)
  equal(reader4.read.get().size, 100)
  deepStrictEqual(reader4.pages.get(), {
    count: 2,
    hasNext: false,
    page: 1,
    show: true
  })

  await reader4.readPage()
  equal(fast4.params.since.get(), 1)
  equal(reader4.list.get().length, 48)
  equal(reader4.read.get().size, 148)
  deepStrictEqual(reader4.pages.get(), {
    count: 2,
    hasNext: false,
    page: 1,
    show: true
  })

  openPage({
    params: { feed: feed1, reader: 'list' },
    route: 'fast'
  })
  let fast5 = openPage({
    params: { category: categoryId, reader: 'list' },
    route: 'fast'
  })
  let reader5 = ensureReader(fast5.posts, 'list')
  await waitLoading(fast5.loading)
  equal(reader5.list.get().length, 0)
  deepStrictEqual(reader5.pages.get(), {
    count: 0,
    hasNext: false,
    page: 0,
    show: false
  })
})
