import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addPost,
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
  for (let i = 1; i <= 60; i++) {
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
    params: { feed: feed1, reader: 'feed' },
    route: 'fast'
  })
  equal(page.loading.get(), true)
  await waitLoading(page.loading)
  let reader = ensureReader(page.posts, 'feed')
  equal(reader.hasNext.get(), false)
  equal(reader.list.get().length, 30)
  equal(reader.list.get()[0]!.title, '60')

  page = openPage({
    params: { category: categoryId, reader: 'feed' },
    route: 'fast'
  })
  equal(page.loading.get(), true)
  await waitLoading(page.loading)
  reader = ensureReader(page.posts, 'feed')
  equal(reader.hasNext.get(), true)
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.title, '60')
  equal(reader.list.get()[49]!.title, '11')

  page.params.since.set(10)
  equal(page.loading.get(), false)
  equal(reader.list.get().length, 9)
  equal(reader.list.get()[0]!.title, '9')
  equal(reader.hasNext.get(), false)

  page.params.since.set(undefined)
  equal(reader.list.get()[0]!.title, '60')
  equal(reader.list.get().length, 50)

  let promise = reader.deleteAndNext()
  equal(reader.list.get()[0]!.title, '10')
  equal(reader.list.get().length, 10)
  equal(reader.hasNext.get(), false)
  await promise

  await reader.deleteAndNext()
  equal(reader.list.get().length, 0)
  equal(reader.hasNext.get(), false)

  page = openPage({
    params: { feed: feed1, reader: 'feed' },
    route: 'fast'
  })
  reader = ensureReader(page.posts, 'feed')
  equal(reader.list.get().length, 0)

  page = openPage({
    params: { category: categoryId, reader: 'feed' },
    route: 'fast'
  })
  reader = ensureReader(page.posts, 'feed')
  equal(reader.list.get().length, 0)
})

test('is ready for the same publishing time', async () => {
  let feedId = await addFeed(testFeed())
  for (let i = 1; i <= 60; i++) {
    await addPost(
      testPost({
        feedId,
        publishedAt: Math.floor(i / 3),
        reading: 'fast',
        title: `${i}`
      })
    )
  }

  let fast = openPage({
    params: { category: 'general', reader: 'feed' },
    route: 'fast'
  })
  await waitLoading(fast.loading)
  let reader = ensureReader(fast.posts, 'feed')

  let all = reader.list.get().length
  reader.deleteAndNext()
  all += reader.list.get().length

  equal(all, 60)
})
