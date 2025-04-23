import { equal } from 'node:assert'
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

  let fast1 = openPage({
    params: { feed: feed1, reader: 'feed' },
    route: 'fast'
  })
  equal(fast1.loading.get(), true)
  await waitLoading(fast1.loading)
  let reader1 = ensureReader(fast1.posts, 'feed')
  equal(reader1.hasNext.get(), false)
  equal(reader1.list.get().length, 30)
  equal(reader1.list.get()[0]!.title, '60')

  let fast2 = openPage({
    params: { category: categoryId, reader: 'feed' },
    route: 'fast'
  })
  equal(fast2.loading.get(), true)
  await waitLoading(fast2.loading)
  let reader2 = ensureReader(fast2.posts, 'feed')
  equal(reader2.hasNext.get(), true)
  equal(reader2.list.get().length, 50)
  equal(reader2.list.get()[0]!.title, '60')
  equal(reader2.list.get()[49]!.title, '11')

  fast2.params.since.set(10)
  equal(fast2.loading.get(), false)
  equal(reader2.list.get().length, 9)
  equal(reader2.list.get()[0]!.title, '9')
  equal(reader2.hasNext.get(), false)

  fast2.params.since.set(undefined)
  equal(reader2.list.get()[0]!.title, '60')
  equal(reader2.list.get().length, 50)

  let promise = reader2.deleteAndNext()
  equal(reader2.list.get()[0]!.title, '10')
  equal(reader2.list.get().length, 10)
  equal(reader2.hasNext.get(), false)
  await promise

  await reader2.deleteAndNext()
  equal(reader2.list.get().length, 0)
  equal(reader2.hasNext.get(), false)

  let fast3 = openPage({
    params: { feed: feed1, reader: 'feed' },
    route: 'fast'
  })
  let reader3 = ensureReader(fast3.posts, 'feed')
  equal(reader3.list.get().length, 0)

  let fast4 = openPage({
    params: { category: categoryId, reader: 'feed' },
    route: 'fast'
  })
  let reader4 = ensureReader(fast4.posts, 'feed')
  equal(reader4.list.get().length, 0)
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
