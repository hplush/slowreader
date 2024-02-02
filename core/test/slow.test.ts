import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  BROKEN_CATEGORY,
  BROKEN_FEED,
  changeCategory,
  deletePost,
  GENERAL_CATEGORY,
  loadCategory,
  loadFeed,
  slowCategories,
  testFeed,
  testPost
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  cleanStores(slowCategories)
  await setTimeout(10)
  await cleanClientTest()
})

test('has empty slow categories from beginning', async () => {
  deepStrictEqual(slowCategories.get(), { isLoading: true })
  await setTimeout(100)
  deepStrictEqual(slowCategories.get(), {
    isLoading: false,
    tree: []
  })
})

test('returns slow feeds', async () => {
  keepMount(slowCategories)
  let categoryB = await addCategory({ title: 'B' })
  let categoryA = await addCategory({ title: 'A' })
  let feedA1 = await addFeed(testFeed({ categoryId: categoryA }))
  let feedA2 = await addFeed(testFeed({ categoryId: categoryA }))
  let feedA3 = await addFeed(testFeed({ categoryId: categoryA }))
  let feedB = await addFeed(testFeed({ categoryId: categoryB }))
  let feedC = await addFeed(testFeed())
  let feedD = await addFeed(testFeed({ categoryId: 'unknown' }))
  await addPost(testPost({ feedId: feedA1, reading: 'slow' }))
  await addPost(testPost({ feedId: feedA1, reading: 'slow' }))
  await addPost(testPost({ feedId: feedA1, reading: 'fast' }))
  await addPost(testPost({ feedId: feedA2, reading: 'slow' }))
  await addPost(testPost({ feedId: feedA3, reading: 'fast' }))
  await addPost(testPost({ feedId: feedB, reading: 'slow' }))
  await addPost(testPost({ feedId: feedC, reading: 'slow' }))
  await addPost(testPost({ feedId: feedD, reading: 'slow' }))
  let post9 = await addPost(testPost({ feedId: 'unknown', reading: 'slow' }))

  await setTimeout(10)
  deepStrictEqual(slowCategories.get(), {
    isLoading: false,
    tree: [
      [
        GENERAL_CATEGORY,
        [
          [await loadFeed(feedC), 1],
          [BROKEN_FEED, 1]
        ]
      ],
      [
        await loadCategory(categoryA),
        [
          [await loadFeed(feedA1), 2],
          [await loadFeed(feedA2), 1]
        ]
      ],
      [await loadCategory(categoryB), [[await loadFeed(feedB), 1]]],
      [BROKEN_CATEGORY, [[await loadFeed(feedD), 1]]]
    ]
  })

  await changeCategory(categoryA, { title: 'New A' })
  await deletePost(post9)

  await setTimeout(10)
  deepStrictEqual(slowCategories.get(), {
    isLoading: false,
    tree: [
      [GENERAL_CATEGORY, [[await loadFeed(feedC), 1]]],
      [await loadCategory(categoryB), [[await loadFeed(feedB), 1]]],
      [
        await loadCategory(categoryA),
        [
          [await loadFeed(feedA1), 2],
          [await loadFeed(feedA2), 1]
        ]
      ],
      [BROKEN_CATEGORY, [[await loadFeed(feedD), 1]]]
    ]
  })
})
