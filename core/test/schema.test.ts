import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addFilter,
  addPost,
  busy,
  cleanDatabase,
  commonMessages,
  database,
  getClient,
  getDatabaseSize,
  loadCategories,
  loadFeeds,
  loadFilters,
  loadPosts,
  setupEnvironment,
  testFeed,
  testPost
} from '../index.ts'
import { getTestEnvironment } from '../test.ts'
import { cleanClientTest, enableClientTest, setTestUser } from './utils.ts'

describe('schema', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('tells that the database is created on the first start', async () => {
    await cleanClientTest()
    setTestUser(false)
    setupEnvironment(getTestEnvironment())
    let labels: string[] = []
    let unbind = busy.listen(value => {
      if (value) labels.push(value.label)
    })

    setTestUser()
    await setTimeout(100)
    deepEqual(labels, [commonMessages.get().creatingDatabase])

    // The hash of the tables’ schema is kept between the starts
    labels = []
    setTestUser(false)
    await setTimeout(100)
    setTestUser()
    await setTimeout(100)
    deepEqual(labels, [commonMessages.get().loadingData])

    unbind()
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

  test('returns the database size', async () => {
    let empty = await getDatabaseSize()
    ok(empty > 0)

    let feedId = await addFeed(testFeed())
    for (let batch = 0; batch < 5; batch++) {
      await addPost(
        Array.from({ length: 20 }, (_, i) => {
          return testPost({
            feedId,
            full: 'a'.repeat(4096),
            originId: `${batch}-${i}`
          })
        })
      )
    }

    let filled = await getDatabaseSize()
    ok(filled > empty)

    await cleanDatabase()
    // Deleted rows go to SQLite’s free list, the file shrinks only on VACUUM
    equal(await getDatabaseSize(), filled)
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
