import { deepStrictEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addPost,
  busy,
  demoMessages,
  deleteDemoWithBusy,
  isDemo,
  keepDemo,
  loadCategories,
  loadFeeds,
  loadPosts,
  testFeed,
  testPost,
  userId
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

describe('demo', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('keeps the demo data as user data', async () => {
    let feedId = await addFeed(testFeed())
    await addPost([testPost({ feedId })])
    let feeds = await loadFeeds()
    let posts = await loadPosts()
    isDemo.set(true)

    keepDemo()

    equal(isDemo.get(), false)
    deepStrictEqual(await loadFeeds(), feeds)
    deepStrictEqual(await loadPosts(), posts)
  })

  test('drops the demo data and keeps the user', async () => {
    let categoryId = await addCategory({ title: 'Demo' })
    let feedId = await addFeed(testFeed({ categoryId }))
    await addPost([testPost({ feedId }), testPost({ feedId })])
    isDemo.set(true)

    let deleting = deleteDemoWithBusy()
    deepStrictEqual(busy.get(), {
      blocking: true,
      label: demoMessages.get().deleting,
      progress: undefined
    })
    await deleting

    equal(isDemo.get(), false)
    deepStrictEqual(await loadPosts(), [])
    deepStrictEqual(await loadFeeds(), [])
    deepStrictEqual(await loadCategories(), [])
    notEqual(userId.get(), undefined)
  })
})
