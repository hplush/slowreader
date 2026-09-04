import { deepStrictEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addPost,
  busy,
  isDemo,
  loadCategories,
  loadFeeds,
  loadPosts,
  storageMessages,
  testFeed,
  testPost,
  userId
} from '../../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  openPage,
  waitUntil
} from '../utils.ts'

describe('storage page', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('shows the database size', async () => {
    await addFeed(testFeed())

    let page = openPage({ params: {}, route: 'storage' })
    equal(page.hasCloud.get(), false)
    equal(page.size.get(), undefined)

    await waitUntil(() => typeof page.size.get() !== 'undefined')
    notEqual(page.size.get(), 0)
  })

  test('leaves the demo mode', async () => {
    let feedId = await addFeed(testFeed())
    await addPost([testPost({ feedId })])
    let feeds = await loadFeeds()
    let posts = await loadPosts()
    isDemo.set(true)
    let page = openPage({ params: {}, route: 'storage' })

    page.keepDemo()

    equal(isDemo.get(), false)
    deepStrictEqual(await loadFeeds(), feeds)
    deepStrictEqual(await loadPosts(), posts)
  })

  test('drops the demo data and keeps the user', async () => {
    let categoryId = await addCategory({ title: 'Demo' })
    let feedId = await addFeed(testFeed({ categoryId }))
    await addPost([testPost({ feedId }), testPost({ feedId })])
    isDemo.set(true)
    let page = openPage({ params: {}, route: 'storage' })

    let dropping = page.dropDemo()
    deepStrictEqual(busy.get(), {
      blocking: true,
      label: storageMessages.get().deletingDemo,
      progress: undefined
    })
    await dropping

    equal(isDemo.get(), false)
    deepStrictEqual(await loadPosts(), [])
    deepStrictEqual(await loadFeeds(), [])
    deepStrictEqual(await loadCategories(), [])
    notEqual(userId.get(), undefined)
  })

  test('compacts the database', async () => {
    await addFeed(testFeed())

    let page = openPage({ params: {}, route: 'storage' })
    await waitUntil(() => typeof page.size.get() !== 'undefined')

    let compacting = page.compact()
    deepStrictEqual(busy.get(), {
      blocking: true,
      label: storageMessages.get().compacting,
      progress: undefined
    })
    await compacting
    equal(busy.get(), false)
    notEqual(page.size.get(), 0)
  })
})
