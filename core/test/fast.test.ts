import { deepStrictEqual } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addFilter,
  fastCategories,
  testFeed
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
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

  await addFilter({
    action: 'fast',
    feedId: feed2,
    query: 'includes(some)'
  })
  await addFilter({
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
    categories: [{ id: 'general', title: '' }],
    isLoading: false
  })
})
