import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addFeed,
  GENERAL_CATEGORY,
  generalReader,
  loadCategory,
  loadFeed,
  openedPopups,
  router,
  testFeed,
  waitLoading
} from '../../index.ts'
import {
  checkLoadedPopup,
  cleanClient,
  openRoute,
  openTestPopup,
  startClient,
  waitUntil
} from '../utils.ts'

describe('category popup', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    generalReader.set('feed')
    await cleanClient()
  })

  test('renames category and changes its reader', async () => {
    let id = await addCategory({ reader: 'list', title: 'Old' })
    let opened = openTestPopup('category', id)
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    if (popup.general) throw new Error('General category was not expected')
    let unbind = popup.reader.listen(() => {})
    equal(popup.category.get().title, 'Old')
    equal(popup.reader.get(), 'list')

    await popup.rename(' New ')
    await popup.rename(' ')
    await waitUntil(() => popup.category.get().title === 'New')

    await popup.changeReader('feed')
    await waitUntil(() => popup.reader.get() === 'feed')
    let saved = await loadCategory(id)
    equal(saved?.reader, 'feed')
    unbind()
  })

  test('deletes category', async () => {
    let id = await addCategory({ title: 'A' })
    let feed = await addFeed(testFeed({ categoryId: id, reading: 'fast' }))
    openRoute({ params: { category: id }, route: 'fast' })
    let opened = openTestPopup('category', id)
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    if (popup.general) throw new Error('General category was not expected')

    let removing = popup.remove()
    equal(openedPopups.get().length, 0)
    deepEqual(router.get().params, {})
    await removing
    equal(await loadCategory(id), undefined)
    equal((await loadFeed(feed))?.categoryId, GENERAL_CATEGORY)
  })

  test('keeps the page on deleting another category', async () => {
    let id = await addCategory({ title: 'A' })
    let other = await addCategory({ title: 'B' })
    openRoute({ params: { category: other }, route: 'fast' })
    let opened = openTestPopup('category', id)
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    if (popup.general) throw new Error('General category was not expected')

    await popup.remove()
    deepEqual(router.get().params, { category: other })
  })

  test('changes only reader of general category', async () => {
    let opened = openTestPopup('category', GENERAL_CATEGORY)
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    equal(popup.general, true)
    equal(popup.category.get().title, 'General')
    equal(popup.reader.get(), 'feed')

    await popup.changeReader('list')
    equal(popup.reader.get(), 'list')
    equal(generalReader.get(), 'list')
  })

  test('shows error on unknown category', async () => {
    let opened = openTestPopup('category', 'unknown')
    await waitLoading(opened.loading)
    equal(opened.notFound, true)
  })
})
