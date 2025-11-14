import { equal } from 'node:assert/strict'
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
  equal(page.loading.get(), false)
  equal(page.posts.get()!.name, 'welcome')

  page = openPage({
    params: {},
    route: 'fast'
  })
  equal(page.params.category.get(), 'general')
  equal(page.loading.get(), false)
  equal(page.posts.get()!.name, 'welcome')

  let category1 = await addCategory({ title: 'A1' })
  let category2 = await addCategory({ title: 'A2' })
  let feed1 = await addFeed(
    testFeed({ categoryId: category1, reading: 'fast' })
  )
  let feed2 = await addFeed(
    testFeed({ categoryId: category2, reading: 'slow' })
  )

  page = openPage({
    params: {},
    route: 'slow'
  })
  equal(page.params.category.get(), undefined)
  equal(page.params.feed.get(), undefined)
  equal(page.loading.get(), false)
  equal(page.posts.get()!.name, 'empty')

  page = openPage({
    params: {},
    route: 'fast'
  })
  equal(page.params.category.get(), category1)
  equal(page.params.feed.get(), undefined)
  equal(page.loading.get(), false)
  equal(page.posts.get()!.name, 'empty')

  await addPost(testPost({ feedId: feed2, reading: 'slow' }))
  await addPost(testPost({ feedId: feed1, reading: 'fast' }))

  page = openPage({
    params: {},
    route: 'slow'
  })
  equal(page.params.category.get(), category2)
  equal(page.params.feed.get(), undefined)
  equal(page.loading.get(), true)
  await waitLoading(page.loading)
  equal(page.posts.get()!.name, 'list')

  page = openPage({
    params: {},
    route: 'fast'
  })
  equal(page.params.category.get(), category1)
  equal(page.params.feed.get(), undefined)
  equal(page.loading.get(), true)
  await waitLoading(page.loading)
  equal(page.posts.get()!.name, 'feed')
})

test('loads readers', async () => {
  let empty = openPage({
    params: {},
    route: 'slow'
  })
  await waitLoading(empty.loading)
  equal(empty.posts.get()?.name, 'welcome')

  let category = await addCategory({ title: '1' })
  let feed = await addFeed(testFeed({ categoryId: category }))
  let slow = openPage({
    params: { category },
    route: 'slow'
  })
  equal(slow.posts.get()!.name, 'empty')

  await addPost(testPost({ feedId: feed, reading: 'slow' }))
  slow = openPage({
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
  equal(fast.posts.get()!.name, 'empty')

  await addPost(testPost({ feedId: feed, reading: 'fast' }))
  equal(fast.posts.get()!.name, 'feed')

  fast.params.reader.set('list')
  equal(fast.posts.get()!.name, 'list')
})
