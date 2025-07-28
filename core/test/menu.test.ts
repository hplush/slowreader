import { loadValue } from '@logux/client'
import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
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
  getFeed,
  isMenuOpened,
  menuLoading,
  openCategory,
  openMenu,
  slowMenu,
  testFeed,
  testPost,
  toggleCategory,
  waitLoading
} from '../index.ts'
import { cleanClientTest, enableClientTest, setBaseTestRoute } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  cleanStores(isMenuOpened, menuLoading, slowMenu, fastMenu)
  await setTimeout(10)
  await cleanClientTest()
})

test('does not open menu if fast has 1 category', async () => {
  setBaseTestRoute({
    params: {},
    route: 'add'
  })
  let idA = await addCategory({ title: 'A' })
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))

  let idB = await addCategory({ title: 'B' })
  let feedB = await addFeed(testFeed({ categoryId: idB, reading: 'slow' }))
  await addPost(testPost({ feedId: feedB, reading: 'slow' }))

  openMenu()
  setBaseTestRoute({ params: {}, route: 'fast' })
  await setTimeout(10)
  equal(isMenuOpened.get(), false)

  closeMenu()
  await setTimeout(10)
  equal(isMenuOpened.get(), false)

  openMenu()
  setBaseTestRoute({ params: {}, route: 'slow' })
  await setTimeout(10)
  equal(isMenuOpened.get(), true)

  closeMenu()
  equal(isMenuOpened.get(), false)

  openMenu()
  setBaseTestRoute({
    params: {},
    route: 'add'
  })
  await setTimeout(10)
  equal(isMenuOpened.get(), true)

  closeMenu()
  equal(isMenuOpened.get(), false)

  await addFeed(testFeed({ categoryId: idB, reading: 'fast' }))
  await setTimeout(10)

  openMenu()
  setBaseTestRoute({ params: {}, route: 'fast' })
  await setTimeout(10)
  equal(isMenuOpened.get(), true)

  closeMenu()
})

test('renders feeds menu', async () => {
  keepMount(fastMenu)
  keepMount(slowMenu)
  equal(menuLoading.get(), true)
  await waitLoading(menuLoading)

  equal(menuLoading.get(), false)
  deepStrictEqual(slowMenu.get(), [])
  deepStrictEqual(fastMenu.get(), [{ id: 'general', title: 'General' }])

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

  deepStrictEqual(slowMenu.get(), [])
  deepStrictEqual(fastMenu.get(), [
    { id: idA, isLoading: false, title: 'A' },
    { id: idB, isLoading: false, title: 'B' },
    { id: idD, isLoading: false, title: 'D' },
    { id: 'general', title: 'General' }
  ])

  await addPost(testPost({ feedId: feed2, reading: 'slow' }))
  await addPost(testPost({ feedId: feed4, reading: 'slow' }))
  await addPost(testPost({ feedId: feed5, reading: 'slow' }))
  await addPost(testPost({ feedId: feed5, reading: 'slow' }))
  deepStrictEqual(slowMenu.get(), [
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
  deepStrictEqual(fastMenu.get(), [
    { id: idA, isLoading: false, title: 'A' },
    { id: idB, isLoading: false, title: 'B' },
    { id: idD, isLoading: false, title: 'D' },
    { id: 'general', title: 'General' }
  ])

  await changeCategory(idA, { title: 'Z' })
  deepStrictEqual(fastMenu.get(), [
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
  deepStrictEqual(slowMenu.get(), [
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
        [await loadValue(getFeed(feed4)), 1],
        [await loadValue(getFeed(feed5)), 2],
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
        ]
      ]
    ]
  ])
  deepStrictEqual(fastMenu.get(), [
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
  deepStrictEqual([...closedCategories.get()], [])
  let idA = await addCategory({ title: 'A' })
  toggleCategory(idA)
  deepStrictEqual([...closedCategories.get()], [idA])
  let idB = await addCategory({ title: 'B' })
  toggleCategory(idB)
  deepStrictEqual([...closedCategories.get()], [idA, idB])
  toggleCategory(idA)
  deepStrictEqual([...closedCategories.get()], [idB])

  toggleCategory(idA)
  openCategory(idB)
  deepStrictEqual([...closedCategories.get()], [idA])
})
