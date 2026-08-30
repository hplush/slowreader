import { LoguxError } from '@logux/core'
import { openDb } from '@nanostores/sql'
import { nodeDriver } from '@nanostores/sql/node'
import { cleanStores, keepMount } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addFilter,
  addPost,
  busy,
  busyUntilMenuLoader,
  changeCategory,
  changeFeed,
  changeFilter,
  closedCategories,
  closeMenu,
  commonMessages,
  deleteCategory,
  deleteFeed,
  deleteFilter,
  fastMenu,
  GENERAL_CATEGORY,
  getClient,
  getEnvironment,
  getTables,
  type MenuItem,
  menuLoading,
  menuSlider,
  openCategory,
  openedMenu,
  openMenu,
  setLayoutType,
  setupEnvironment,
  slowMenu,
  syncError,
  syncStatus,
  syncStatusType,
  testFeed,
  testPost,
  toggleCategory,
  userId,
  waitLoading
} from '../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  expectWarning,
  getTestEnvironment,
  setBaseTestRoute,
  setTestUser,
  waitUntil
} from './utils.ts'

function emit(obj: any, event: string, ...args: any[]): void {
  obj.emitter.emit(event, ...args)
}

const GENERAL: MenuItem = { id: GENERAL_CATEGORY, title: '' }

describe('menu', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    cleanStores(menuLoading, slowMenu, fastMenu)
    await setTimeout(10)
    await cleanClientTest()
  })

  test('has special menu logic on mobile', async () => {
    setLayoutType('mobile')
    let category1 = await addCategory({ title: '1' })
    let category2 = await addCategory({ title: '2' })
    let slow = await addFeed(
      testFeed({ categoryId: category1, reading: 'slow' })
    )
    await addFeed(testFeed({ categoryId: category1, reading: 'fast' }))
    await setTimeout(10)

    setBaseTestRoute({
      params: {},
      route: 'welcome'
    })
    equal(menuSlider.get(), undefined)
    equal(openedMenu.get(), undefined)

    equal(openMenu('other'), false)
    equal(menuSlider.get(), 'other')
    equal(openedMenu.get(), 'other')

    closeMenu()
    setBaseTestRoute({
      params: {},
      route: 'add'
    })
    equal(menuSlider.get(), 'other')
    equal(openedMenu.get(), undefined)

    equal(openMenu('slow'), true)
    equal(menuSlider.get(), 'other')
    equal(openedMenu.get(), undefined)

    setBaseTestRoute({
      params: {},
      route: 'slow'
    })
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), undefined)

    equal(openMenu('fast'), true)
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), undefined)

    setBaseTestRoute({
      params: {},
      route: 'fast'
    })
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), undefined)

    await addPost(testPost({ feedId: slow, reading: 'slow' }))
    await setTimeout(10)
    equal(openMenu('slow'), false)
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), 'slow')

    closeMenu()
    setBaseTestRoute({
      params: { feed: slow },
      route: 'slow'
    })
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), undefined)

    equal(openMenu('fast'), true)
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), undefined)

    setBaseTestRoute({
      params: {},
      route: 'fast'
    })
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), undefined)

    equal(openMenu('other'), false)
    equal(menuSlider.get(), 'other')
    equal(openedMenu.get(), 'other')

    closeMenu()
    setBaseTestRoute({
      params: {},
      route: 'add'
    })

    await addFeed(testFeed({ categoryId: category2, reading: 'fast' }))
    await setTimeout(10)

    equal(openMenu('fast'), false)
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), 'fast')

    closeMenu()
    setBaseTestRoute({
      params: { category: category1 },
      route: 'fast'
    })
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), undefined)
  })

  test('has straightforward menu logic on desktop', async () => {
    let category1 = await addCategory({ title: '1' })
    let category2 = await addCategory({ title: '2' })
    let slow = await addFeed(
      testFeed({ categoryId: category1, reading: 'slow' })
    )
    await addFeed(testFeed({ categoryId: category1, reading: 'fast' }))
    await setTimeout(10)

    setBaseTestRoute({
      params: {},
      route: 'welcome'
    })
    equal(menuSlider.get(), undefined)
    equal(openedMenu.get(), undefined)

    equal(openMenu('other'), true)
    equal(menuSlider.get(), undefined)
    equal(openedMenu.get(), undefined)

    setBaseTestRoute({
      params: {},
      route: 'add'
    })
    equal(menuSlider.get(), 'other')
    equal(openedMenu.get(), 'other')

    equal(openMenu('slow'), true)
    equal(menuSlider.get(), 'other')
    equal(openedMenu.get(), 'other')

    setBaseTestRoute({
      params: {},
      route: 'slow'
    })
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), 'slow')

    equal(openMenu('fast'), true)
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), 'slow')

    setBaseTestRoute({
      params: {},
      route: 'fast'
    })
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), 'fast')

    await addPost(testPost({ feedId: slow, reading: 'slow' }))
    await setTimeout(10)
    equal(openMenu('slow'), true)
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), 'fast')

    setBaseTestRoute({
      params: { feed: slow },
      route: 'slow'
    })
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), 'slow')

    equal(openMenu('fast'), true)
    equal(menuSlider.get(), 'slow')
    equal(openedMenu.get(), 'slow')

    setBaseTestRoute({
      params: {},
      route: 'fast'
    })
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), 'fast')

    equal(openMenu('other'), true)
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), 'fast')

    setBaseTestRoute({
      params: {},
      route: 'add'
    })

    await addFeed(testFeed({ categoryId: category2, reading: 'fast' }))
    await setTimeout(10)

    equal(openMenu('fast'), true)
    equal(menuSlider.get(), 'other')
    equal(openedMenu.get(), 'other')

    setBaseTestRoute({
      params: { category: category1 },
      route: 'fast'
    })
    equal(menuSlider.get(), 'fast')
    equal(openedMenu.get(), 'fast')
  })

  test('renders feeds menu', async () => {
    keepMount(fastMenu)
    keepMount(slowMenu)
    equal(menuLoading.get(), true)
    await waitLoading(menuLoading)

    equal(menuLoading.get(), false)
    deepEqual(slowMenu.get(), [])
    deepEqual(fastMenu.get(), [GENERAL])

    let idB = await addCategory({ title: 'B' })
    let feed1 = await addFeed(
      testFeed({ categoryId: idB, reading: 'slow', title: '1' })
    )
    await addFilter({
      action: 'fast',
      feedId: feed1,
      query: 'include(a)'
    })
    let idC = await addCategory({ title: 'C' })
    let feed2 = await addFeed(
      testFeed({ categoryId: idC, reading: 'slow', title: '2' })
    )
    await addFilter({
      action: 'slow',
      feedId: feed2,
      query: 'include(a)'
    })
    let idD = await addCategory({ title: 'D' })
    let feed3 = await addFeed(
      testFeed({ categoryId: idD, reading: 'slow', title: '3' })
    )
    await addPost(testPost({ feedId: feed3, reading: 'fast' }))
    let feed4 = await addFeed(testFeed({ reading: 'fast', title: '4' }))
    let feed5 = await addFeed(testFeed({ reading: 'slow', title: '5' }))
    let idA = await addCategory({ title: 'A' })
    await addFeed(testFeed({ categoryId: idA, reading: 'fast', title: '6' }))

    deepEqual(slowMenu.get(), [])
    deepEqual(fastMenu.get(), [
      GENERAL,
      { id: idA, title: 'A' },
      { id: idB, title: 'B' }
    ])

    await addPost(testPost({ feedId: feed2, reading: 'slow' }))
    await addPost(testPost({ feedId: feed4, reading: 'slow' }))
    await addPost(testPost({ feedId: feed5, reading: 'slow' }))
    await addPost(testPost({ feedId: feed5, reading: 'slow' }))
    deepEqual(slowMenu.get(), [
      [
        GENERAL,
        [
          [{ id: feed4, title: '4' }, 1],
          [{ id: feed5, title: '5' }, 2]
        ]
      ],
      [{ id: idC, title: 'C' }, [[{ id: feed2, title: '2' }, 1]]]
    ])
    deepEqual(fastMenu.get(), [
      GENERAL,
      { id: idA, title: 'A' },
      { id: idB, title: 'B' }
    ])

    await changeCategory(idA, { title: 'Z' })
    deepEqual(fastMenu.get(), [
      GENERAL,
      { id: idB, title: 'B' },
      { id: idA, title: 'Z' }
    ])

    await addPost(testPost({ feedId: 'unknown', reading: 'fast' }))
    await addPost(testPost({ feedId: 'unknown', reading: 'slow' }))
    let orphan = await addFeed(
      testFeed({ categoryId: 'unknown', reading: 'fast', title: '7' })
    )
    await addPost(testPost({ feedId: orphan, reading: 'slow' }))
    deepEqual(slowMenu.get(), [
      [
        GENERAL,
        [
          [{ id: feed4, title: '4' }, 1],
          [{ id: feed5, title: '5' }, 2]
        ]
      ],
      [{ id: idC, title: 'C' }, [[{ id: feed2, title: '2' }, 1]]]
    ])
    deepEqual(fastMenu.get(), [
      GENERAL,
      { id: idB, title: 'B' },
      { id: idA, title: 'Z' }
    ])
  })

  test('updates menu on feed and category changes', async () => {
    keepMount(fastMenu)
    keepMount(slowMenu)
    await waitLoading(menuLoading)

    let idA = await addCategory({ title: 'A' })
    let idB = await addCategory({ title: 'B' })
    let feed1 = await addFeed(
      testFeed({ categoryId: idA, reading: 'slow', title: 'Feed 1' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId: idA, reading: 'slow', title: 'Feed 2' })
    )
    await addPost(testPost({ feedId: feed1, reading: 'slow' }))
    await addPost(testPost({ feedId: feed2, reading: 'slow' }))

    deepEqual(fastMenu.get(), [GENERAL])
    deepEqual(slowMenu.get(), [
      [
        { id: idA, title: 'A' },
        [
          [{ id: feed1, title: 'Feed 1' }, 1],
          [{ id: feed2, title: 'Feed 2' }, 1]
        ]
      ]
    ])

    await changeFeed(feed1, { title: 'Feed 3' })
    deepEqual(slowMenu.get(), [
      [
        { id: idA, title: 'A' },
        [
          [{ id: feed2, title: 'Feed 2' }, 1],
          [{ id: feed1, title: 'Feed 3' }, 1]
        ]
      ]
    ])

    let sorted = slowMenu.get()
    await changeFeed(feed1, { title: 'Feed 3' })
    equal(slowMenu.get(), sorted)

    await changeFeed(feed1, { lastOriginId: '1', refreshedAt: 1000 })
    equal(slowMenu.get(), sorted)

    await changeFeed(feed1, { categoryId: idB })
    deepEqual(slowMenu.get(), [
      [{ id: idA, title: 'A' }, [[{ id: feed2, title: 'Feed 2' }, 1]]],
      [{ id: idB, title: 'B' }, [[{ id: feed1, title: 'Feed 3' }, 1]]]
    ])

    await changeFeed([feed1, feed2], {
      categoryId: GENERAL_CATEGORY,
      title: 'Feed 4'
    })
    deepEqual(slowMenu.get(), [
      [
        GENERAL,
        [
          [{ id: feed1, title: 'Feed 4' }, 1],
          [{ id: feed2, title: 'Feed 4' }, 1]
        ]
      ]
    ])

    await changeFeed(feed1, { categoryId: idB, reading: 'fast' })
    deepEqual(fastMenu.get(), [{ id: idB, title: 'B' }])

    await changeFeed(feed1, { reading: 'slow' })
    deepEqual(fastMenu.get(), [GENERAL])

    await changeFeed('unknown', { title: 'Unknown' })
    await deleteFeed(feed1)
    await deleteFeed(feed1)
    deepEqual(slowMenu.get(), [
      [GENERAL, [[{ id: feed2, title: 'Feed 4' }, 1]]]
    ])

    let general = slowMenu.get()
    await changeCategory(idB, { fastReader: 'list' })
    equal(slowMenu.get(), general)

    await deleteCategory(idA)
    deepEqual(slowMenu.get(), [
      [GENERAL, [[{ id: feed2, title: 'Feed 4' }, 1]]]
    ])

    let deleted = slowMenu.get()
    await deleteCategory(idA)
    await changeCategory(idA, { title: 'Deleted' })
    equal(slowMenu.get(), deleted)
  })

  test('updates menu on filter changes', async () => {
    keepMount(fastMenu)
    keepMount(slowMenu)
    await waitLoading(menuLoading)

    let idA = await addCategory({ title: 'A' })
    let idB = await addCategory({ title: 'B' })
    let feed1 = await addFeed(
      testFeed({ categoryId: idA, reading: 'slow', title: 'Feed 1' })
    )
    let feed2 = await addFeed(
      testFeed({ categoryId: idB, reading: 'slow', title: 'Feed 2' })
    )
    deepEqual(fastMenu.get(), [GENERAL])

    let filter = await addFilter({
      action: 'fast',
      feedId: feed1,
      query: 'include(a)'
    })
    deepEqual(fastMenu.get(), [{ id: idA, title: 'A' }])

    let fast = fastMenu.get()
    await changeFilter(filter, { query: 'include(b)' })
    equal(fastMenu.get(), fast)

    await changeFilter(filter, { feedId: feed2 })
    deepEqual(fastMenu.get(), [{ id: idB, title: 'B' }])

    await changeFilter(filter, { action: 'slow' })
    deepEqual(fastMenu.get(), [GENERAL])

    await changeFilter('unknown', { action: 'fast' })
    deepEqual(fastMenu.get(), [GENERAL])

    await changeFilter(filter, { action: 'fast' })
    deepEqual(fastMenu.get(), [{ id: idB, title: 'B' }])

    await deleteFilter(filter)
    deepEqual(fastMenu.get(), [GENERAL])

    let empty = fastMenu.get()
    await deleteFilter(filter)
    equal(fastMenu.get(), empty)
  })

  test('reduces batch actions', async () => {
    keepMount(fastMenu)
    keepMount(slowMenu)
    await waitLoading(menuLoading)

    let [idA, idB] = await getTables().categories.create([
      { title: 'A' },
      { title: 'B' }
    ])
    let [feed1, feed2] = await getTables().feeds.create([
      testFeed({ categoryId: idA, reading: 'fast', title: 'Feed 1' }),
      testFeed({ categoryId: idB!, reading: 'slow', title: 'Feed 2' })
    ])
    await addPost(testPost({ feedId: feed2!, reading: 'slow' }))

    deepEqual(fastMenu.get(), [{ id: idA, title: 'A' }])
    deepEqual(slowMenu.get(), [
      [{ id: idB, title: 'B' }, [[{ id: feed2, title: 'Feed 2' }, 1]]]
    ])

    await getTables().feeds.delete([feed1!, feed2!])
    await getTables().categories.delete([idA!, idB!])
    deepEqual(fastMenu.get(), [GENERAL])
    deepEqual(slowMenu.get(), [])
  })

  test('ignores actions re-sent by the server', async () => {
    keepMount(slowMenu)
    await waitLoading(menuLoading)

    let category = await addCategory({ title: 'A' })
    let feed = await addFeed(
      testFeed({ categoryId: category, reading: 'slow', title: 'Feed' })
    )
    await addPost(testPost({ feedId: feed, reading: 'slow' }))

    // The body of the shadowed action is not in the log anymore,
    // so the re-sent action is added to the log again
    await getClient().log.add({
      fields: { categoryId: category, reading: 'slow', title: 'Feed' },
      id: feed,
      type: 'feeds/created'
    })
    await setTimeout(10)

    deepEqual(slowMenu.get(), [
      [{ id: category, title: 'A' }, [[{ id: feed, title: 'Feed' }, 1]]]
    ])
  })

  test('loads menu from the storage', async () => {
    await cleanClientTest()
    setTestUser(false)
    setupEnvironment(getTestEnvironment())
    let storage = getEnvironment().persistentStore
    storage['logux:reducer:slowreader:menu'] = '1'
    storage['slowreader:menu'] = JSON.stringify({
      categories: [['category', 'From Storage']],
      fast: { feed: true },
      feedOf: { feed: 'category' },
      feeds: { category: [['feed', 'Feed']] },
      filters: {}
    })
    setTestUser()

    keepMount(fastMenu)
    keepMount(slowMenu)
    await waitLoading(menuLoading)
    deepEqual(fastMenu.get(), [{ id: 'category', title: 'From Storage' }])
  })

  test('rebuilds menu from the log on new version', async () => {
    await cleanClientTest()
    setTestUser(false)
    let file = join(tmpdir(), `slowreader-menu-${process.pid}.sqlite`)
    rmSync(file, { force: true })
    try {
      enableClientTest({ databaseCreator: () => openDb(nodeDriver(file)) })
      keepMount(fastMenu)
      keepMount(slowMenu)
      await waitLoading(menuLoading)

      let category = await addCategory({ title: 'A' })
      await addFeed(
        testFeed({ categoryId: category, reading: 'fast', title: 'Feed' })
      )
      deepEqual(fastMenu.get(), [{ id: category, title: 'A' }])

      userId.set(undefined)
      cleanStores(menuLoading, slowMenu, fastMenu)
      await setTimeout(100)

      getEnvironment().persistentStore['logux:reducer:slowreader:menu'] = '0'
      setTestUser()
      keepMount(fastMenu)
      keepMount(slowMenu)
      await waitLoading(menuLoading)
      deepEqual(fastMenu.get(), [{ id: category, title: 'A' }])
    } finally {
      await cleanClientTest()
      await setTimeout(100)
      rmSync(file, { force: true })
    }
  })

  test('rebuilds menu from the tables when the state was lost', async () => {
    await cleanClientTest()
    setTestUser(false)
    let file = join(tmpdir(), `slowreader-lost-${process.pid}.sqlite`)
    rmSync(file, { force: true })
    try {
      enableClientTest({ databaseCreator: () => openDb(nodeDriver(file)) })
      keepMount(fastMenu)
      keepMount(slowMenu)
      await waitLoading(menuLoading)

      let category = await addCategory({ title: 'A' })
      let feed = await addFeed(
        testFeed({ categoryId: category, reading: 'slow', title: 'Feed' })
      )
      await addPost(testPost({ feedId: feed, reading: 'slow' }))

      userId.set(undefined)
      cleanStores(menuLoading, slowMenu, fastMenu)
      await setTimeout(100)

      // The actions were applied to the tables by the tab, which was closed
      // before the reducer got them
      let storage = getEnvironment().persistentStore
      delete storage['slowreader:menu']
      storage['logux:reducer:slowreader:menu'] = '1'
      setTestUser()
      keepMount(fastMenu)
      keepMount(slowMenu)
      await waitLoading(menuLoading)
      await waitUntil(() => slowMenu.get().length > 0)

      deepEqual(slowMenu.get(), [
        [{ id: category, title: 'A' }, [[{ id: feed, title: 'Feed' }, 1]]]
      ])
      equal(storage['logux:reducer:slowreader:menu'], '1')
    } finally {
      await cleanClientTest()
      await setTimeout(100)
      rmSync(file, { force: true })
    }
  })

  test('has helper to block app while menu is loading', async () => {
    busyUntilMenuLoader()
    deepEqual(busy.get(), {
      blocking: false,
      label: commonMessages.get().loadingData,
      progress: undefined
    })
    await setTimeout(10)
    equal(busy.get(), false)
    equal(menuLoading.get(), false)
  })

  test('has helper which is ready for no client', async () => {
    await cleanClientTest()
    await busyUntilMenuLoader()
  })

  test('tracks closed categories', async () => {
    deepEqual([...closedCategories.get()], [])
    let idA = await addCategory({ title: 'A' })
    toggleCategory(idA)
    deepEqual([...closedCategories.get()], [idA])
    let idB = await addCategory({ title: 'B' })
    toggleCategory(idB)
    deepEqual([...closedCategories.get()], [idA, idB])
    toggleCategory(idA)
    deepEqual([...closedCategories.get()], [idB])

    toggleCategory(idA)
    openCategory(idB)
    deepEqual([...closedCategories.get()], [idA])
  })

  test('has sync status', async () => {
    let unbind = syncStatus.listen(() => {})
    let unbindType = syncStatusType.listen(() => {})
    equal(syncStatus.get(), 'disconnected')
    equal(syncStatusType.get(), 'other')

    syncStatus.set('wait')
    equal(syncStatusType.get(), 'wait')

    let wrongFormat = new LoguxError('wrong-format', 'test error')
    await expectWarning(async () => {
      emit(getClient().node, 'error', wrongFormat)
      await setTimeout(10)
    }, [wrongFormat])
    equal(syncStatus.get(), 'error')
    equal(syncError.get(), 'Wrong message format in test error')

    syncStatus.set('disconnected')
    getClient().log.add(
      { action: { type: 'some' }, reason: 'denied', type: 'logux/undo' },
      { id: '0 server:0 0' }
    )
    await setTimeout(10)
    equal(syncStatus.get(), 'error')
    equal(syncStatusType.get(), 'error')
    equal(syncError.get(), 'some')

    await cleanClientTest()
    equal(syncStatus.get(), 'local')
    equal(syncStatusType.get(), 'other')

    unbindType()
    unbind()
  })
})
