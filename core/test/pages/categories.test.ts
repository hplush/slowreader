import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addAccount,
  addCategory,
  addFeed,
  addPost,
  changeAccount,
  deleteCategory,
  GENERAL_CATEGORY,
  getGeneralCategory,
  loadAccount,
  loadCategory,
  loadFeed,
  loadPosts,
  loaders,
  router,
  testAccount,
  testFeed,
  trackSeen,
  testPost,
  waitLoading
} from '../../index.ts'
import {
  cleanClient,
  startClient,
  startUserBeforeKey,
  openPage
} from '../utils.ts'

describe('categories page', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    restoreAll()
    await cleanClient()
  })

  test('opens before the encryption key is loaded', async () => {
    startUserBeforeKey()
    let page = openPage({
      params: {},
      route: 'categories'
    })
    await waitLoading(page.loading)
    deepEqual(page.groups.get(), [])
  })

  test('keeps categories closed by default', () => {
    let page = openPage({ params: {}, route: 'categories' })
    deepEqual([...page.expanded.get()], [])

    page.toggle('a')
    page.expand('b')
    page.expand('b')
    deepEqual([...page.expanded.get()], ['a', 'b'])

    page.toggle('a')
    deepEqual([...page.expanded.get()], ['b'])
  })

  test('expands category from URL and removes it from URL', () => {
    let page = openPage({ params: { open: 'a' }, route: 'categories' })
    deepEqual(router.get().params, {})
    deepEqual([...page.expanded.get()], ['a'])
    equal(page.scrollTarget.get(), 'a')
    page.scrolled()
    equal(page.scrollTarget.get(), undefined)

    openPage({ params: { open: 'b' }, route: 'categories' })
    deepEqual(router.get().params, {})
    deepEqual([...page.expanded.get()], ['a', 'b'])
    equal(page.scrollTarget.get(), 'b')

    page.scrolled()
    openPage({ params: { open: 'b' }, route: 'categories' })
    equal(page.scrollTarget.get(), 'b')
  })

  test('groups feeds by categories', async t => {
    let page = openPage({
      params: {},
      route: 'categories'
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
    deepEqual(page.readings.get(), {
      [(await loadFeed(feed1))!.url]: 'fast',
      [(await loadFeed(feed2))!.url]: 'fast'
    })
    trackSeen(feed1, 2)
    t.after(page.stats.listen(() => {}))
    deepEqual([...page.stats.get()], [])
    page.expand(idA)
    deepEqual(Object.fromEntries(page.stats.get()), {
      [feed1]: { disliked: 0, liked: 0, max: 2, opened: 0, seen: 2 },
      [feed2]: { disliked: 0, liked: 0, max: 2, opened: 0, seen: 0 }
    })

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

  test('adds category and scrolls to it', async () => {
    let page = openPage({ params: {}, route: 'categories' })
    await waitLoading(page.loading)

    await page.add('A')
    let category = page.groups.get()[0]![0]
    equal(category.title, 'A')
    equal(page.scrollTarget.get(), category.id)
  })

  test('moves feeds to general on category deletion', async () => {
    let idA = await addCategory({ title: 'A' })
    let idB = await addCategory({ title: 'B' })
    let feed1 = await addFeed(testFeed({ categoryId: idA, title: '1' }))
    let feed2 = await addFeed(testFeed({ categoryId: idA, title: '2' }))
    let feed3 = await addFeed(testFeed({ categoryId: idB, title: '3' }))

    let page = openPage({
      params: {},
      route: 'categories'
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

  test('syncs follows and shows account feeds', async t => {
    let category = await addCategory({ title: 'A' })
    let accountId = await addAccount(testAccount({ categoryId: category }))
    await addAccount(testAccount({ expired: true }))
    let virtual = await addFeed(
      testFeed({ accountId, categoryId: null, title: '1' })
    )
    await addPost(testPost({ feedId: virtual, originId: 'read' }))
    loaders.mastodon.account!.getReadPosts = () => Promise.resolve(['read'])
    t.after(() => {
      delete loaders.mastodon.account!.getReadPosts
    })
    let { promise, resolve } =
      Promise.withResolvers<{ title: string; url: string }[]>()
    let follows = spyOn(loaders.mastodon.account!, 'getFollows', () => promise)

    let page = openPage({ params: {}, route: 'categories' })
    equal(page.sync.get(), 'checking')
    await waitLoading(page.loading)
    equal(page.sync.get(), 'syncing')
    deepEqual(page.groups.get(), [
      [await loadCategory(category), [await loadFeed(virtual)]]
    ])

    resolve([{ title: '1', url: (await loadFeed(virtual))!.url }])
    await promise
    await setTimeout(10)
    equal(page.sync.get(), 'done')
    equal(follows.callCount, 1)
    deepEqual(await loadPosts(), [])

    openPage({ params: {}, route: 'welcome' })
    page = openPage({ params: {}, route: 'categories' })
    await waitLoading(page.loading)
    equal(page.sync.get(), 'none')
    equal(follows.callCount, 1)

    let syncedAt = (await loadAccount(accountId))!.followsSyncedAt!
    await changeAccount(accountId, { followsSyncedAt: syncedAt - 86400 })
    openPage({ params: {}, route: 'welcome' })
    page = openPage({ params: {}, route: 'categories' })
    await waitLoading(page.loading)
    equal(page.sync.get(), 'syncing')
    await setTimeout(10)
    equal(follows.callCount, 2)
  })
})
