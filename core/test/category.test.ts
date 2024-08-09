import { ensureLoaded, loadValue } from '@logux/client'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addCategory,
  addFeed,
  changeCategory,
  deleteCategory,
  feedsByCategory,
  getCategories,
  loadCategories,
  loadCategory,
  loadFeed,
  loadFeeds,
  testFeed
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

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

  let loaded = await loadCategories()
  equal(loaded.length, 1)
  equal(loaded[0]!.title, 'Fun')

  deepStrictEqual(await loadCategory(id), added[0])

  await changeCategory(id, { title: 'Memes' })
  let changed = ensureLoaded(all.get()).list
  equal(changed.length, 1)
  equal(changed[0]!.title, 'Memes')

  await deleteCategory(id)
  deepStrictEqual(ensureLoaded(all.get()).list, [])
})

test('groups feeds in simple case', async () => {
  let idA = await addCategory({ title: 'A' })
  let feed1 = await addFeed(testFeed({ categoryId: idA, title: '1' }))
  let feed2 = await addFeed(testFeed({ categoryId: idA, title: '2' }))

  deepStrictEqual(feedsByCategory(await loadCategories(), await loadFeeds()), [
    [
      { id: idA, isLoading: false, title: 'A' },
      [await loadFeed(feed1), await loadFeed(feed2)]
    ]
  ])
})

test('groups feeds in complex case', async () => {
  let idA = await addCategory({ title: 'A' })
  let idC = await addCategory({ title: 'C' })
  let idB = await addCategory({ title: 'B' })
  let feed1 = await addFeed(testFeed({ categoryId: idA, title: '1' }))
  let feed2 = await addFeed(testFeed({ categoryId: idA, title: '2' }))
  let feed3 = await addFeed(testFeed({ categoryId: idB, title: '1' }))
  let feed4 = await addFeed(testFeed({ categoryId: 'general', title: '1' }))
  let feed5 = await addFeed(testFeed({ categoryId: 'unknown', title: '1' }))

  deepStrictEqual(feedsByCategory(await loadCategories(), await loadFeeds()), [
    [{ id: 'general', title: '' }, [await loadFeed(feed4)]],
    [
      { id: idA, isLoading: false, title: 'A' },
      [await loadFeed(feed1), await loadFeed(feed2)]
    ],
    [{ id: idB, isLoading: false, title: 'B' }, [await loadFeed(feed3)]],
    [{ id: idC, isLoading: false, title: 'C' }, []],
    [{ id: 'broken', title: '' }, [await loadFeed(feed5)]]
  ])
})
