import { deepStrictEqual, equal, notEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addPost,
  busy,
  deleteDemoWithBusy,
  hasSources,
  isDemo,
  keepDemo,
  loadCategories,
  loadFeeds,
  loadPosts,
  RELEASES_FEED,
  testFeed,
  testPost,
  userId,
  welcomeMessages
} from '../index.ts'
import { cleanClient, startClient } from './utils.ts'

describe('demo', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
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
      label: welcomeMessages.get().deleting,
      progress: undefined
    })
    await deleting

    equal(isDemo.get(), false)
    deepStrictEqual(await loadPosts(), [])
    deepStrictEqual(await loadFeeds(), [])
    deepStrictEqual(await loadCategories(), [])
    notEqual(userId.get(), undefined)
  })

  test('keeps releases feed on dropping the demo', async () => {
    let demoCategory = await addCategory({ title: 'Demo' })
    let demoFeed = await addFeed(testFeed({ categoryId: demoCategory }))
    let categoryId = await addCategory({ title: 'Slow Reader' })
    let feedId = await addFeed(testFeed({ categoryId, url: RELEASES_FEED }))
    await addPost([
      testPost({ feedId: demoFeed }),
      testPost({ feedId, title: 'Release' })
    ])
    isDemo.set(true)
    equal(hasSources.get(), true)

    await deleteDemoWithBusy()

    equal(isDemo.get(), false)
    deepStrictEqual(
      (await loadPosts()).map(i => i.title),
      ['Release']
    )
    deepStrictEqual(
      (await loadFeeds()).map(i => i.id),
      [feedId]
    )
    deepStrictEqual(
      (await loadCategories()).map(i => i.id),
      [categoryId]
    )
    equal(hasSources.get(), false)
  })
})
