import { cleanStores, keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  clearFast,
  closeMenu,
  fastCategories,
  isMenuOpened,
  openMenu,
  setBaseTestRoute,
  slowCategories,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  clearFast()
  cleanStores(fastCategories, slowCategories, isMenuOpened)
  await setTimeout(10)
  await cleanClientTest()
})

test('open the menu if fast or slow has categories', async () => {
  setBaseTestRoute({ params: {}, route: 'add' })
  let idA = await addCategory({ title: 'A' })
  await addFeed(testFeed({ reading: 'fast' }))
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))

  let idB = await addCategory({ title: 'B' })
  let idC = await addCategory({ title: 'C' })
  let feedB = await addFeed(testFeed({ categoryId: idB, reading: 'slow' }))
  let feedC = await addFeed(testFeed({ categoryId: idC, reading: 'slow' }))
  await addPost(testPost({ feedId: feedB, reading: 'slow' }))
  await addPost(testPost({ feedId: feedC, reading: 'slow' }))

  keepMount(fastCategories)
  keepMount(slowCategories)
  await setTimeout(100)

  setBaseTestRoute({ params: {}, route: 'fast' })
  await setTimeout(100)
  equal(isMenuOpened.get(), true)

  closeMenu()
  equal(isMenuOpened.get(), false)

  openMenu()
  equal(isMenuOpened.get(), true)

  setBaseTestRoute({ params: {}, route: 'slow' })
  closeMenu()
  await setTimeout(100)

  equal(isMenuOpened.get(), true)

  closeMenu()
  equal(isMenuOpened.get(), false)

  openMenu()
  equal(isMenuOpened.get(), true)
})

test('do not open the menu if fast or slow does not have categories', async () => {
  setBaseTestRoute({ params: {}, route: 'add' })

  setBaseTestRoute({ params: {}, route: 'fast' })
  closeMenu()
  await setTimeout(100)

  equal(isMenuOpened.get(), false)

  setBaseTestRoute({ params: {}, route: 'slow' })
  closeMenu()
  await setTimeout(100)

  equal(isMenuOpened.get(), false)
})

test('open the menu on the add route if we switch from the fast or slow routes', async () => {
  setBaseTestRoute({ params: {}, route: 'fast' })
  await setTimeout(100)

  equal(isMenuOpened.get(), false)

  setBaseTestRoute({ params: {}, route: 'add' })
  await setTimeout(100)

  equal(isMenuOpened.get(), true)

  closeMenu()
  equal(isMenuOpened.get(), false)
})

test('do not open the menu on the add route if we switch from other routes', async () => {
  setBaseTestRoute({ params: {}, route: 'export' })
  await setTimeout(100)

  equal(isMenuOpened.get(), false)

  openMenu()

  setBaseTestRoute({ params: {}, route: 'add' })
  closeMenu()
  await setTimeout(100)

  equal(isMenuOpened.get(), false)

  openMenu()
  equal(isMenuOpened.get(), true)

  closeMenu()
  equal(isMenuOpened.get(), false)
})
