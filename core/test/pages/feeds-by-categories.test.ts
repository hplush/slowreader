import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  deleteCategory,
  GENERAL_CATEGORY,
  getGeneralCategory,
  loadCategory,
  loadFeed,
  testFeed,
  waitLoading
} from '../../index.ts'
import { cleanClientTest, enableClientTest, openPage } from '../utils.ts'

describe('feeds by categories page', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('groups feeds by categories', async () => {
    let page = openPage({
      params: {},
      route: 'feedsByCategories'
    })

    equal(page.loading.get(), true)
    await waitLoading(page.loading)
    deepEqual(page.groups.get(), [])

    let idA = await addCategory({ title: 'A' })
    let feed1 = await addFeed(testFeed({ categoryId: idA, title: '1' }))
    let feed2 = await addFeed(testFeed({ categoryId: idA, title: '2' }))
    deepEqual(page.groups.get(), [
      [await loadCategory(idA), [await loadFeed(feed1), await loadFeed(feed2)]]
    ])

    let idC = await addCategory({ title: 'C' })
    let idB = await addCategory({ title: 'B' })
    let feed3 = await addFeed(testFeed({ categoryId: idB, title: '1' }))
    let feed4 = await addFeed(
      testFeed({ categoryId: GENERAL_CATEGORY, title: '1' })
    )

    deepEqual(page.groups.get(), [
      [getGeneralCategory(), [await loadFeed(feed4)]],
      [await loadCategory(idA), [await loadFeed(feed1), await loadFeed(feed2)]],
      [await loadCategory(idB), [await loadFeed(feed3)]],
      [await loadCategory(idC), []]
    ])

    openPage({
      params: {},
      route: 'welcome'
    })
  })

  test('moves feeds to general on category deletion', async () => {
    let idA = await addCategory({ title: 'A' })
    let idB = await addCategory({ title: 'B' })
    let feed1 = await addFeed(testFeed({ categoryId: idA, title: '1' }))
    let feed2 = await addFeed(testFeed({ categoryId: idA, title: '2' }))
    let feed3 = await addFeed(testFeed({ categoryId: idB, title: '3' }))

    let page = openPage({
      params: {},
      route: 'feedsByCategories'
    })
    await waitLoading(page.loading)
    deepEqual(page.groups.get(), [
      [await loadCategory(idA), [await loadFeed(feed1), await loadFeed(feed2)]],
      [await loadCategory(idB), [await loadFeed(feed3)]]
    ])

    await deleteCategory(idA)
    deepEqual(page.groups.get(), [
      [getGeneralCategory(), [await loadFeed(feed1), await loadFeed(feed2)]],
      [await loadCategory(idB), [await loadFeed(feed3)]]
    ])
  })
})
