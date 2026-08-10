import { deepEqual } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  addFilter,
  addPost,
  cleanDatabase,
  database,
  getClient,
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

  test('cleans all tables without stopping the database', async () => {
    let categoryId = await addCategory({ title: 'A' })
    let feedId = await addFeed(testFeed({ categoryId }))
    await addFilter({ action: 'fast', feedId, query: 'include(a)' })
    await addPost(testPost({ feedId }))

    await cleanDatabase()

    deepEqual(await loadCategories(), [])
    deepEqual(await loadFeeds(), [])
    deepEqual(await loadFilters(), [])
    deepEqual(await loadPosts(), [])

    await addCategory({ title: 'B' })
    deepEqual((await loadCategories()).length, 1)
  })

  test('does nothing without database', async () => {
    await cleanClientTest()
    await cleanDatabase()
  })

  test('drops all tables on sign-out', async () => {
    let categoryId = await addCategory({ title: 'A' })
    let feedId = await addFeed(testFeed({ categoryId }))
    await addFilter({ action: 'fast', feedId, query: 'include(a)' })
    await addPost(testPost({ feedId }))

    let db = database.get()!
    await getClient().clean()

    let tables = await db.select<{ name: string }>`
      SELECT "name" FROM "sqlite_master" WHERE "type" = 'table'
    `
    deepEqual(
      tables.map(row => row.name).filter(name => !name.startsWith('logux_')),
      []
    )
    let actions = await db.select<{ total: number }>`
      SELECT COUNT("added") AS "total" FROM "logux_log"
    `
    deepEqual(actions[0]!.total, 0)
  })
})
