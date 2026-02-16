import { loadValue } from '@logux/client'
import { LoguxError } from '@logux/core'
import { cleanStores, keepMount } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
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
  closedCategories,
  closeMenu,
  fastMenu,
  getClient,
  getFeed,
  menuLoading,
  menuSlider,
  openCategory,
  openedMenu,
  openMenu,
  setLayoutType,
  slowMenu,
  syncError,
  syncStatus,
  syncStatusType,
  testFeed,
  testPost,
  toggleCategory,
  waitLoading
} from '../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  expectWarning,
  setBaseTestRoute
} from './utils.ts'

function emit(obj: any, event: string, ...args: any[]): void {
  obj.emitter.emit(event, ...args)
}

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
    await setTimeout(1)

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
    await setTimeout(1)
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
    await setTimeout(1)

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
    await setTimeout(1)

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
    await setTimeout(1)
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
    await setTimeout(1)

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
    deepEqual(fastMenu.get(), [{ id: 'general', title: 'General' }])

    let idB = await addCategory({ title: 'B' })
    let feed1 = await addFeed(testFeed({ categoryId: idB, reading: 'slow' }))
    await addFilter({
      action: 'fast',
      feedId: feed1,
      query: 'include(a)'
    })
    let idC = await addCategory({ title: 'C' })
    let feed2 = await addFeed(testFeed({ categoryId: idC, reading: 'slow' }))
    await addFilter({
      action: 'slow',
      feedId: feed2,
      query: 'include(a)'
    })
    let idD = await addCategory({ title: 'D' })
    let feed3 = await addFeed(testFeed({ categoryId: idD, reading: 'slow' }))
    await addPost(testPost({ feedId: feed3, reading: 'fast' }))
    let feed4 = await addFeed(testFeed({ reading: 'fast' }))
    let feed5 = await addFeed(testFeed({ reading: 'slow' }))
    let idA = await addCategory({ title: 'A' })
    await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))

    deepEqual(slowMenu.get(), [])
    deepEqual(fastMenu.get(), [
      { id: idA, isLoading: false, title: 'A' },
      { id: idB, isLoading: false, title: 'B' },
      { id: idD, isLoading: false, title: 'D' },
      { id: 'general', title: 'General' }
    ])

    await addPost(testPost({ feedId: feed2, reading: 'slow' }))
    await addPost(testPost({ feedId: feed4, reading: 'slow' }))
    await addPost(testPost({ feedId: feed5, reading: 'slow' }))
    await addPost(testPost({ feedId: feed5, reading: 'slow' }))
    deepEqual(slowMenu.get(), [
      [
        { id: idC, isLoading: false, title: 'C' },
        [[await loadValue(getFeed(feed2)), 1]]
      ],
      [
        { id: 'general', title: 'General' },
        [
          [await loadValue(getFeed(feed4)), 1],
          [await loadValue(getFeed(feed5)), 2]
        ]
      ]
    ])
    deepEqual(fastMenu.get(), [
      { id: idA, isLoading: false, title: 'A' },
      { id: idB, isLoading: false, title: 'B' },
      { id: idD, isLoading: false, title: 'D' },
      { id: 'general', title: 'General' }
    ])

    await changeCategory(idA, { title: 'Z' })
    deepEqual(fastMenu.get(), [
      { id: idB, isLoading: false, title: 'B' },
      { id: idD, isLoading: false, title: 'D' },
      { id: 'general', title: 'General' },
      { id: idA, isLoading: false, title: 'Z' }
    ])

    await addPost(testPost({ feedId: 'unknown', reading: 'fast' }))
    await addPost(testPost({ feedId: 'unknown', reading: 'slow' }))
    let broken = await addFeed(
      testFeed({ categoryId: 'unknown', reading: 'fast' })
    )
    await addPost(testPost({ feedId: broken, reading: 'slow' }))
    deepEqual(slowMenu.get(), [
      [
        { id: 'broken', title: 'Broken category' },
        [[await loadValue(getFeed(broken)), 1]]
      ],
      [
        { id: idC, isLoading: false, title: 'C' },
        [[await loadValue(getFeed(feed2)), 1]]
      ],
      [
        { id: 'general', title: 'General' },
        [
          [
            {
              categoryId: 'general',
              id: 'missed',
              lastOriginId: undefined,
              lastPublishedAt: undefined,
              loader: 'atom',
              reading: 'slow',
              title: 'Missed',
              url: ''
            },
            1
          ],
          [await loadValue(getFeed(feed4)), 1],
          [await loadValue(getFeed(feed5)), 2]
        ]
      ]
    ])
    deepEqual(fastMenu.get(), [
      { id: idB, isLoading: false, title: 'B' },
      { id: 'broken', title: 'Broken category' },
      { id: idD, isLoading: false, title: 'D' },
      { id: 'general', title: 'General' },
      { id: idA, isLoading: false, title: 'Z' }
    ])
  })

  test('has helper to block app while menu is loading', async () => {
    busyUntilMenuLoader()
    equal(busy.get(), true)
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
