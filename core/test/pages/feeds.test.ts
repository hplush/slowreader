import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

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
import {
  cleanClientTest,
  enableClientTest,
  openPage,
  setBaseTestRoute
} from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  setBaseTestRoute({ params: {}, route: 'about' })
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
  equal(page.params.feed.get(), undefined)
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
  equal(page.params.category.get(), undefined)
  equal(page.params.feed.get(), feed2)
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

  let category1 = await addCategory({ title: '1' })
  let category2 = await addCategory({ title: '1' })
  let feed1 = await addFeed(
    testFeed({ categoryId: category1, reading: 'slow' })
  )
  let feed2 = await addFeed(
    testFeed({ categoryId: category2, reading: 'fast' })
  )
  let feed3 = await addFeed(
    testFeed({ categoryId: 'general', reading: 'slow' })
  )
  let page = openPage({
    params: { feed: feed3 },
    route: 'slow'
  })
  equal(page.posts.get()!.name, 'empty')

  await addPost(testPost({ feedId: feed1, reading: 'slow' }))
  await addPost(testPost({ feedId: feed3, reading: 'slow' }))
  page = openPage({
    params: { feed: feed3 },
    route: 'slow'
  })
  equal(page.posts.get()!.name, 'list')

  page = openPage({
    params: { feed: feed1 },
    route: 'slow'
  })
  equal(page.posts.get()!.name, 'list')

  page.changeReader('feed')
  await setTimeout(1)
  equal(page.posts.get()!.name, 'feed')

  page = openPage({
    params: { feed: feed2 },
    route: 'slow'
  })
  equal(page.posts.get()!.name, 'list')

  page = openPage({
    params: { feed: feed1 },
    route: 'slow'
  })
  equal(page.posts.get()!.name, 'feed')

  page = openPage({
    params: { category: category1 },
    route: 'fast'
  })
  await setTimeout(1)
  equal(page.posts.get()!.name, 'empty')

  await addPost(testPost({ feedId: feed2, reading: 'fast' }))
  equal(page.posts.get()!.name, 'feed')

  page.changeReader('list')
  await setTimeout(10)
  equal(page.posts.get()!.name, 'list')

  page = openPage({
    params: { category: category2 },
    route: 'fast'
  })
  equal(page.posts.get(), undefined)
  await setTimeout(1)
  equal(page.posts.get()!.name, 'feed')

  page = openPage({
    params: { category: category1 },
    route: 'fast'
  })
  equal(page.posts.get()!.name, 'list')
})
