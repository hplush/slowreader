import { cleanStores, keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  clearFast,
  fastCategories,
  isMenuOpened,
  setBaseTestRoute,
  slowCategories,
  testFeed,
  testPost,
  toggleMenu
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  clearFast()
  cleanStores(fastCategories, slowCategories)
  await setTimeout(10)
  await cleanClientTest()
})

test('works if fast and slow has categories', async () => {
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

  toggleMenu()
  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), true)

  setBaseTestRoute({ params: {}, route: 'slow' })
  await setTimeout(100)
  equal(isMenuOpened.get(), true)

  toggleMenu()
  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), true)
})

test('works if fast and slow has not categories', async () => {
  setBaseTestRoute({ params: {}, route: 'add' })
  setBaseTestRoute({ params: {}, route: 'fast' })
  await setTimeout(100)

  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), false)

  setBaseTestRoute({ params: {}, route: 'slow' })
  await setTimeout(100)

  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), false)
})

test('works on other routes', async () => {
  setBaseTestRoute({ params: {}, route: 'fast' })
  await setTimeout(100)

  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), false)

  setBaseTestRoute({ params: {}, route: 'add' })
  await setTimeout(100)

  equal(isMenuOpened.get(), true)

  toggleMenu()
  equal(isMenuOpened.get(), false)

  toggleMenu()
  equal(isMenuOpened.get(), true)
})
