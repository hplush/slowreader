import { ensureLoaded, loadValue } from '@logux/client'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addFilter,
  changeCategory,
  deleteCategory,
  fastCategories,
  feedCategory,
  feedsByCategory,
  getCategories,
  getFeed,
  getFeeds,
  testFeed
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('adds, changes and removes categories', async () => {
  let all = getCategories()
  await loadValue(all)
  deepStrictEqual(ensureLoaded(all.get()).list, [])

  let id = await addCategory({ title: 'Fun' })
  equal(typeof id, 'string')
  let added = ensureLoaded(all.get()).list
  equal(added.length, 1)
  equal(added[0]!.title, 'Fun')

  await changeCategory(id, { title: 'Memes' })
  let changed = ensureLoaded(all.get()).list
  equal(changed.length, 1)
  equal(changed[0]!.title, 'Memes')

  await deleteCategory(id)
  deepStrictEqual(ensureLoaded(all.get()).list, [])
})

test('returns category ID', async () => {
  let id = await addCategory({ title: 'A' })
  let categories = await loadValue(getCategories())

  equal(feedCategory(id, categories), id)
  equal(feedCategory(undefined, categories), 'general')
  equal(feedCategory('unknown', categories), 'general')
})

test('groups feeds', async () => {
  let idA = await addCategory({ title: 'A' })
  let idC = await addCategory({ title: 'C' })
  let idB = await addCategory({ title: 'B' })
  let feed1 = await addFeed(testFeed({ categoryId: idA, title: '1' }))
  let feed2 = await addFeed(testFeed({ categoryId: idA, title: '2' }))
  let feed3 = await addFeed(testFeed({ categoryId: idB, title: '1' }))
  let feed4 = await addFeed(testFeed({ title: '1' }))
  let feed5 = await addFeed(testFeed({ categoryId: 'unknown', title: '1' }))

  let feeds = await loadValue(getFeeds())
  let categories = await loadValue(getCategories())
  deepStrictEqual(feedsByCategory(categories, feeds.list), [
    [
      { id: 'general', title: '' },
      [getFeed(feed5).get(), getFeed(feed4).get()]
    ],
    [
      { id: idA, isLoading: false, title: 'A' },
      [getFeed(feed2).get(), getFeed(feed1).get()]
    ],
    [{ id: idB, isLoading: false, title: 'B' }, [getFeed(feed3).get()]],
    [{ id: idC, isLoading: false, title: 'C' }, []]
  ])
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
