import { strictEqual } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  backRoutes,
  router,
  setBaseTestRoute,
  side,
  testFeed,
  testPost
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('show first side', () => {
  setBaseTestRoute({ params: {}, route: 'add' })
  strictEqual(side.get(), 'first')

  setBaseTestRoute({ params: {}, route: 'categories' })
  strictEqual(side.get(), 'first')

  setBaseTestRoute({ params: {}, route: 'fast' })
  strictEqual(side.get(), 'first')

  setBaseTestRoute({ params: {}, route: 'slow' })
  strictEqual(side.get(), 'first')
})

// test('show second step: add/url', async () => {
//   setBaseTestRoute({ params: { url: 'dev.to/feed' }, route: 'add' })
//   await setTimeout(100)
//   strictEqual(side.get(), 'second')
// })

test('show second side: categories/feed', async () => {
  setBaseTestRoute({ params: { feed: 'feed' }, route: 'categories' })
  await setTimeout(100)
  strictEqual(side.get(), 'second')
})

test('show second side: fast/category/post', async () => {
  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  let post = await addPost(testPost({ feedId: feed }))
  setBaseTestRoute({ params: { category: idA, post }, route: 'fast' })
  await setTimeout(100)
  strictEqual(side.get(), 'second')
  strictEqual(backRoutes[router.get().route], `/fast/${idA}`)
})

test('show second side: slow/feed/post', async () => {
  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'slow' }))
  let post = await addPost(testPost({ feedId: feed }))
  setBaseTestRoute({ params: { feed, post }, route: 'slow' })
  await setTimeout(100)
  strictEqual(side.get(), 'second')
  strictEqual(backRoutes[router.get().route], `/slow/${feed}`)
})
