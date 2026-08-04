import { deepEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addFilter,
  addPost,
  cleanDatabase,
  loadCategories,
  loadFeeds,
  loadFilters,
  loadPosts,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

describe('schema', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('cleans all tables', async () => {
    let categoryId = await addCategory({ title: 'A' })
    let feedId = await addFeed(testFeed({ categoryId }))
    await addFilter({ action: 'fast', feedId, query: 'include(a)' })
    await addPost(testPost({ feedId }))

    await cleanDatabase()

    deepEqual(await loadCategories(), [])
    deepEqual(await loadFeeds(), [])
    deepEqual(await loadFilters(), [])
    deepEqual(await loadPosts(), [])
  })

  test('does nothing without database', async () => {
    await cleanClientTest()
    await cleanDatabase()
  })
})
