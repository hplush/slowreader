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

  let page = openPage({
    params: {},
    route: 'slow'
  })
  equal(page.params.category.get(), undefined)
  equal(page.empty.get(), true)

  page = openPage({
    params: {},
    route: 'fast'
  })
  equal(page.params.category.get(), 'general')
  equal(page.empty.get(), false)
  await waitLoading(page.loading)
  equal(page.empty.get(), true)

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

  page = openPage({
    params: {},
    route: 'slow'
  })
  equal(page.params.category.get(), category2)
  equal(page.params.feed.get(), undefined)
  equal(page.empty.get(), false)

  page = openPage({
    params: {},
    route: 'fast'
  })
  equal(page.params.category.get(), category1)
  equal(page.params.feed.get(), undefined)
  await waitLoading(page.loading)
  equal(page.empty.get(), false)
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
