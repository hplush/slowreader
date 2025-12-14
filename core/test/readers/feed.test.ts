import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

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

test('reads posts', async () => {
  let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
  let feed1 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
  let feed2 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
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
    params: { feed: feed1 },
    route: 'fast'
  })
  equal(page.loading.get(), true)
  equal(page.postsLoading.get(), true)
  await waitLoading(page.loading)
  equal(page.postsLoading.get(), false)
  let reader = ensureReader(page.posts, 'feed')
  equal(reader.hasNext.get(), false)
  equal(reader.authors.get().size, 0)
  equal(reader.list.get().length, 30)
  equal(reader.list.get()[0]!.get().title, '60')

  page = openPage({
    params: { category: categoryId },
    route: 'fast'
  })
  equal(page.loading.get(), false)
  equal(page.postsLoading.get(), true)
  await waitLoading(page.postsLoading)
  reader = ensureReader(page.posts, 'feed')
  equal(reader.hasNext.get(), true)
  equal(reader.authors.get().size, 2)
  equal(reader.authors.get().get(feed1)!.get().title, 'Test 1')
  equal(reader.authors.get().get(feed2)!.get().title, 'Test 2')
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.get().title, '60')
  equal(reader.list.get()[49]!.get().title, '11')

  page.params.from.set(10)
  equal(page.loading.get(), false)
  equal(reader.list.get().length, 9)
  equal(reader.list.get()[0]!.get().title, '9')
  equal(reader.hasNext.get(), false)

  page.params.from.set(undefined)
  equal(reader.list.get()[0]!.get().title, '60')
  equal(reader.list.get().length, 50)

  let promise = reader.readAndNext()
  equal(reader.list.get()[0]!.get().title, '10')
  equal(reader.list.get().length, 10)
  equal(reader.hasNext.get(), false)
  await promise

  await reader.readAndNext()
  equal(page.posts.get()?.name, 'empty')
  await setTimeout(10)

  openPage({
    params: {},
    route: 'interface'
  })
  await setTimeout(10)
  page = openPage({
    params: { feed: feed1 },
    route: 'fast'
  })
  await setTimeout(10)
  equal(page.posts.get()?.name, 'empty')

  page = openPage({
    params: { category: categoryId },
    route: 'fast'
  })
  equal(page.posts.get()?.name, 'empty')
})

test('moves with or without reading', async () => {
  let categoryId = await addCategory({ fastReader: 'feed', title: 'A' })
  let feed1 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
  let feed2 = await addFeed(testFeed({ categoryId, fastReader: 'feed' }))
  for (let i = 1; i <= 110; i++) {
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
    params: { category: categoryId },
    route: 'fast'
  })
  await waitLoading(page.loading)
  let reader = ensureReader(page.posts, 'feed')
  equal(reader.hasNext.get(), true)
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.get().title, '110')
  equal(reader.list.get()[0]!.get().read, undefined)

  await reader.readAndNext()
  equal(reader.hasNext.get(), true)
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.get().title, '60')
  equal(reader.list.get()[0]!.get().read, undefined)

  page.params.from.set(reader.prevFrom.get())
  equal(reader.hasNext.get(), true)
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.get().title, '110')
  equal(reader.list.get()[0]!.get().read, true)

  page.params.from.set(reader.nextFrom.get())
  equal(reader.hasNext.get(), true)
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.get().title, '60')
  equal(reader.list.get()[0]!.get().read, undefined)

  page.params.from.set(reader.nextFrom.get())
  equal(reader.hasNext.get(), false)
  equal(reader.list.get().length, 10)
  equal(reader.list.get()[0]!.get().title, '10')
  equal(reader.list.get()[0]!.get().read, undefined)

  page.params.from.set(reader.prevFrom.get())
  equal(reader.hasNext.get(), true)
  equal(reader.list.get().length, 50)
  equal(reader.list.get()[0]!.get().title, '60')
  equal(reader.list.get()[0]!.get().read, undefined)
})
