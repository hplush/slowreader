import { cleanStores } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  closeMenu,
  fastCategories,
  isMenuOpened,
  openMenu,
  setBaseTestRoute,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  cleanStores(fastCategories, isMenuOpened)
  await setTimeout(10)
  await cleanClientTest()
})

test('do not open menu if fast has 1 category', async () => {
  setBaseTestRoute({ params: {}, route: 'add' })
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
  setBaseTestRoute({ params: {}, route: 'add' })
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
