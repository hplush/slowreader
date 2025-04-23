import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addPost,
  busy,
  busyUntilMenuLoader,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { cleanClientTest, enableClientTest, openPage } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('redirects', async () => {
  busyUntilMenuLoader()
  await waitLoading(busy)

  let slow1 = openPage({
    params: {},
    route: 'slow'
  })
  equal(slow1.params.category.get(), undefined)
  equal(slow1.empty.get(), true)

  let fast1 = openPage({
    params: {},
    route: 'fast'
  })
  equal(fast1.params.category.get(), 'general')
  equal(fast1.empty.get(), false)
  await waitLoading(fast1.loading)
  equal(fast1.empty.get(), true)

  let category1 = await addCategory({ title: 'A1' })
  let category2 = await addCategory({ title: 'A2' })
  let feed1 = await addFeed(
    testFeed({ categoryId: category1, reading: 'fast' })
  )
  let feed2 = await addFeed(
    testFeed({ categoryId: category2, reading: 'slow' })
  )
  await addPost(testPost({ feedId: feed2, reading: 'slow' }))
  await addPost(testPost({ feedId: feed1, reading: 'fast' }))

  let slow2 = openPage({
    params: {},
    route: 'slow'
  })
  equal(slow2.params.category.get(), category2)
  equal(slow2.params.feed.get(), undefined)
  equal(slow2.empty.get(), false)

  let fast2 = openPage({
    params: {},
    route: 'fast'
  })
  equal(fast2.params.category.get(), category1)
  equal(fast2.params.feed.get(), undefined)
  await waitLoading(fast2.loading)
  equal(fast2.empty.get(), false)
})

test('loads readers', async () => {
  let empty = openPage({
    params: {},
    route: 'slow'
  })
  equal(empty.posts.get(), undefined)

  let category = await addCategory({ title: '1' })

  let slow = openPage({
    params: { category },
    route: 'slow'
  })
  equal(slow.posts.get()!.name, 'list')

  slow.params.reader.set('feed')
  equal(slow.posts.get()!.name, 'feed')

  let fast = openPage({
    params: { category },
    route: 'fast'
  })
  equal(fast.posts.get()!.name, 'feed')

  fast.params.reader.set('list')
  equal(fast.posts.get()!.name, 'list')
})
