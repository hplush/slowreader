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
  loadPost,
  openedSlowPost,
  setBaseTestRoute,
  slowCategories,
  slowPosts,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  cleanStores(slowCategories, slowPosts, openedSlowPost)
  await setTimeout(10)
  await cleanClientTest()
})

test('has empty slow categories from beginning', async () => {
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

test('loads posts from URL', async () => {
  keepMount(openedSlowPost)
  keepMount(slowPosts)

  let feedA = await addFeed(testFeed({ reading: 'slow' }))
  let feedB = await addFeed(testFeed({ reading: 'slow' }))
  let postA1 = await addPost(
    testPost({ feedId: feedA, publishedAt: 1002, reading: 'slow', title: 'A1' })
  )
  let postA2 = await addPost(
    testPost({ feedId: feedA, publishedAt: 1001, reading: 'slow', title: 'A2' })
  )
  let postB = await addPost(
    testPost({ feedId: feedB, reading: 'slow', title: 'B' })
  )

  setBaseTestRoute({ params: {}, route: 'about' })
  deepStrictEqual(slowPosts.get(), { isLoading: true })
  deepStrictEqual(openedSlowPost.get(), undefined)

  setBaseTestRoute({ params: {}, route: 'slow' })
  deepStrictEqual(slowPosts.get(), { isLoading: true })
  deepStrictEqual(openedSlowPost.get(), undefined)

  setBaseTestRoute({ params: { feed: feedA }, route: 'slow' })
  deepStrictEqual(slowPosts.get(), { isLoading: true })
  deepStrictEqual(openedSlowPost.get(), undefined)

  await setTimeout(10)
  deepStrictEqual(slowPosts.get(), {
    isLoading: false,
    list: [await loadPost(postA1), await loadPost(postA2)]
  })
  deepStrictEqual(openedSlowPost.get(), undefined)

  setBaseTestRoute({ params: { feed: feedA, post: postA1 }, route: 'slow' })
  deepStrictEqual(slowPosts.get(), {
    isLoading: false,
    list: [await loadPost(postA1), await loadPost(postA2)]
  })
  deepStrictEqual(openedSlowPost.get(), await loadPost(postA1))

  setBaseTestRoute({ params: { feed: feedA, post: postA2 }, route: 'slow' })
  deepStrictEqual(slowPosts.get(), {
    isLoading: false,
    list: [await loadPost(postA1), await loadPost(postA2)]
  })
  deepStrictEqual(openedSlowPost.get(), await loadPost(postA2))

  setBaseTestRoute({ params: { feed: feedA, post: postB }, route: 'slow' })
  deepStrictEqual(slowPosts.get(), {
    isLoading: false,
    list: [await loadPost(postA1), await loadPost(postA2)]
  })
  deepStrictEqual(openedSlowPost.get(), await loadPost(postB))

  setBaseTestRoute({ params: { feed: feedA }, route: 'slow' })
  deepStrictEqual(slowPosts.get(), {
    isLoading: false,
    list: [await loadPost(postA1), await loadPost(postA2)]
  })
  deepStrictEqual(openedSlowPost.get(), undefined)

  setBaseTestRoute({ params: { feed: feedB }, route: 'slow' })
  deepStrictEqual(slowPosts.get(), { isLoading: true })

  await setTimeout(10)
  deepStrictEqual(slowPosts.get(), {
    isLoading: false,
    list: [await loadPost(postB)]
  })

  setBaseTestRoute({ params: {}, route: 'slow' })
  deepStrictEqual(slowPosts.get(), { isLoading: true })
  deepStrictEqual(openedSlowPost.get(), undefined)
})
