import { cleanStores } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addFilter,
  addPost,
  clearFast,
  constantFastReading,
  deleteFilter,
  fastCategories,
  fastCategory,
  fastLoading,
  fastPosts,
  fastSince,
  getPosts,
  loadFastPost,
  markReadAndLoadNextFastPosts,
  nextFastSince,
  setFastPostsPerPage,
  testFeed,
  testPost
} from '../index.js'
import { loadList } from '../utils/stores.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  clearFast()
  cleanStores(
    constantFastReading,
    fastPosts,
    fastLoading,
    nextFastSince,
    fastCategories,
    fastCategory,
    fastSince
  )
  await cleanClientTest()
})

test('has empty fast categories from beginning', async () => {
  deepStrictEqual(fastCategories.get(), { isLoading: true })
  await setTimeout(100)
  deepStrictEqual(fastCategories.get(), {
    categories: [{ id: 'general', title: '' }],
    isLoading: false
  })
})

test('returns fast categories', async () => {
  let idC = await addCategory({ title: 'C' })
  let idB = await addCategory({ title: 'B' })
  let idA = await addCategory({ title: 'A' })

  await addFeed(testFeed({ reading: 'fast' }))
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  let feed2 = await addFeed(testFeed({ categoryId: idB, reading: 'slow' }))
  await addFeed(testFeed({ categoryId: idC, reading: 'slow' }))

  let filter1 = await addFilter({
    action: 'fast',
    feedId: feed2,
    query: 'includes(some)'
  })
  let filter2 = await addFilter({
    action: 'fast',
    feedId: feed2,
    query: 'includes(other)'
  })

  fastCategories.listen(() => {})
  await setTimeout(100)
  deepStrictEqual(fastCategories.get(), {
    categories: [
      { id: 'general', title: '' },
      { id: idA, isLoading: false, title: 'A' },
      { id: idB, isLoading: false, title: 'B' }
    ],
    isLoading: false
  })

  await deleteFilter(filter1)
  await deleteFilter(filter2)
  deepStrictEqual(fastCategories.get(), {
    categories: [
      { id: 'general', title: '' },
      { id: idA, isLoading: false, title: 'A' }
    ],
    isLoading: false
  })
})

test('returns fast category without general', async () => {
  let idA = await addCategory({ title: 'A' })
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))

  fastCategories.listen(() => {})
  await setTimeout(100)

  deepStrictEqual(fastCategories.get(), {
    categories: [{ id: idA, isLoading: false, title: 'A' }],
    isLoading: false
  })
})

test('is ready for unknown categories in fast category', async () => {
  await addFeed(testFeed({ categoryId: 'unknown', reading: 'fast' }))

  fastCategories.listen(() => {})
  await setTimeout(100)

  deepStrictEqual(fastCategories.get(), {
    categories: [{ id: 'broken', title: '' }],
    isLoading: false
  })
})

test('is ready for fast post in slow feed', async () => {
  let categoryA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: categoryA, reading: 'slow' }))
  await addPost(testPost({ feedId: feed, reading: 'fast' }))

  fastCategories.listen(() => {})
  await setTimeout(100)

  deepStrictEqual(fastCategories.get(), {
    categories: [{ id: categoryA, isLoading: false, title: 'A' }],
    isLoading: false
  })
})

test('is ready for broken fast post', async () => {
  await addPost(testPost({ feedId: 'missed', reading: 'fast' }))

  fastCategories.listen(() => {})
  await setTimeout(100)

  deepStrictEqual(fastCategories.get(), {
    categories: [{ id: 'general', title: '' }],
    isLoading: false
  })
})

test('loads page when we have no fast posts', async () => {
  constantFastReading.listen(() => {})
  fastPosts.listen(() => {})
  fastLoading.listen(() => {})
  nextFastSince.listen(() => {})

  let promise = loadFastPost('general')
  equal(fastLoading.get(), 'init')
  await promise
  equal(fastLoading.get(), false)
  deepStrictEqual(fastPosts.get(), [])
  equal(constantFastReading.get(), 0)
  equal(nextFastSince.get(), undefined)
})

test('loads page when we have fast posts', async () => {
  constantFastReading.listen(() => {})
  fastPosts.listen(() => {})
  fastLoading.listen(() => {})
  nextFastSince.listen(() => {})
  fastCategory.listen(() => {})
  fastSince.listen(() => {})
  setFastPostsPerPage(5)

  let category1 = await addCategory({ title: '1' })
  let feed1 = await addFeed(testFeed({ categoryId: category1 }))
  let feed2 = await addFeed(testFeed({ categoryId: category1 }))
  let feed3 = await addFeed(testFeed({ categoryId: 'general' }))

  for (let [feedIndex, feed] of [feed1, feed2].entries()) {
    for (let i = 0; i < 6; i++) {
      await addPost(
        testPost({
          feedId: feed,
          publishedAt: 1000 * i + feedIndex,
          reading: 'fast',
          title: `F${feedIndex} P${i}`
        })
      )
    }
  }
  await addPost(testPost({ feedId: feed1, reading: 'slow' }))
  await addPost(
    testPost({
      feedId: feed3,
      publishedAt: 1000,
      reading: 'fast',
      title: `F3 P0`
    })
  )

  await loadFastPost(category1)
  equal(fastLoading.get(), false)
  equal(fastCategory.get(), category1)
  equal(fastSince.get(), undefined)
  equal(constantFastReading.get(), 0)
  equal(nextFastSince.get(), 3001)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F1 P5', 'F0 P5', 'F1 P4', 'F0 P4', 'F1 P3']
  )

  let promise1 = markReadAndLoadNextFastPosts()
  equal(fastLoading.get(), 'next')
  await promise1
  equal(fastLoading.get(), false)
  equal(fastCategory.get(), category1)
  equal(fastSince.get(), 3001)
  equal(constantFastReading.get(), 1)
  equal(nextFastSince.get(), 1000)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F0 P3', 'F1 P2', 'F0 P2', 'F1 P1', 'F0 P1']
  )

  await addPost(
    testPost({
      feedId: feed1,
      publishedAt: 100000,
      reading: 'fast',
      title: `F1 P100`
    })
  )

  await markReadAndLoadNextFastPosts()
  equal(fastLoading.get(), false)
  equal(constantFastReading.get(), 2)
  equal(nextFastSince.get(), undefined)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F1 P0', 'F0 P0']
  )

  let promise2 = markReadAndLoadNextFastPosts()
  equal(fastLoading.get(), 'next')
  await promise2
  equal(fastLoading.get(), false)
  equal(constantFastReading.get(), 3)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    []
  )

  deepStrictEqual((await loadList(getPosts({ reading: 'fast' }))).length, 2)
  deepStrictEqual((await loadList(getPosts({ reading: 'slow' }))).length, 1)

  await loadFastPost(category1)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F1 P100']
  )
  equal(constantFastReading.get(), 0)
  equal(nextFastSince.get(), undefined)

  await markReadAndLoadNextFastPosts()

  deepStrictEqual((await loadList(getPosts({ reading: 'fast' }))).length, 1)
  await loadFastPost(category1)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    []
  )
  equal(constantFastReading.get(), 0)
  equal(nextFastSince.get(), undefined)
})

test('allows to change category in the middle', async () => {
  constantFastReading.listen(() => {})
  fastPosts.listen(() => {})
  fastLoading.listen(() => {})
  nextFastSince.listen(() => {})
  setFastPostsPerPage(5)

  let category1 = await addCategory({ title: '1' })
  let feed1 = await addFeed(testFeed({ categoryId: category1 }))
  let feed2 = await addFeed(testFeed({ categoryId: category1 }))
  let feed3 = await addFeed(testFeed({ categoryId: 'general' }))

  for (let [feedIndex, feed] of [feed1, feed2, feed3].entries()) {
    for (let i = 0; i < 6; i++) {
      await addPost(
        testPost({
          feedId: feed,
          publishedAt: 1000 * i + feedIndex,
          reading: 'fast',
          title: `F${feedIndex} P${i}`
        })
      )
      await addPost(testPost({ feedId: feed, reading: 'slow' }))
    }
  }

  await loadFastPost(category1)
  equal(constantFastReading.get(), 0)

  await markReadAndLoadNextFastPosts()
  equal(constantFastReading.get(), 1)

  let promise = loadFastPost('general')
  equal(fastLoading.get(), 'init')
  await promise
  equal(fastLoading.get(), false)
  equal(fastCategory.get(), 'general')
  equal(fastSince.get(), undefined)
  equal(constantFastReading.get(), 0)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F2 P5', 'F2 P4', 'F2 P3', 'F2 P2', 'F2 P1']
  )
})

test('allows to preview next page without marking as read', async () => {
  constantFastReading.listen(() => {})
  fastPosts.listen(() => {})
  fastLoading.listen(() => {})
  nextFastSince.listen(() => {})
  setFastPostsPerPage(5)

  let feed1 = await addFeed(testFeed({ categoryId: 'general' }))
  let feed2 = await addFeed(testFeed({ categoryId: 'general' }))

  for (let [feedIndex, feed] of [feed1, feed2].entries()) {
    for (let i = 0; i < 6; i++) {
      await addPost(
        testPost({
          feedId: feed,
          publishedAt: 1000 * i + feedIndex,
          reading: 'fast',
          title: `F${feedIndex} P${i}`
        })
      )
    }
  }

  await loadFastPost('general')
  equal(constantFastReading.get(), 0)
  equal(nextFastSince.get(), 3001)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F1 P5', 'F0 P5', 'F1 P4', 'F0 P4', 'F1 P3']
  )

  await loadFastPost('general', nextFastSince.get())
  equal(constantFastReading.get(), 0)
  equal(nextFastSince.get(), 1000)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F0 P3', 'F1 P2', 'F0 P2', 'F1 P1', 'F0 P1']
  )

  await markReadAndLoadNextFastPosts()
  equal(constantFastReading.get(), 1)
  equal(nextFastSince.get(), undefined)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    ['F1 P0', 'F0 P0']
  )

  await markReadAndLoadNextFastPosts()
  equal(constantFastReading.get(), 2)
  deepStrictEqual(
    fastPosts.get().map(i => i.title),
    []
  )
})
