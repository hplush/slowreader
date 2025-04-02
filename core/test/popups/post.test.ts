import { cleanStores, keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  addPost,
  openedPopups,
  setBaseTestRoute,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import {
  checkLoadedPopup,
  cleanClientTest,
  closeLastTestPopup,
  enableClientTest,
  getPopup,
  openTestPopup
} from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(openedPopups)
})

test('opens post', async () => {
  keepMount(openedPopups)
  let feed = await addFeed(testFeed({ categoryId: 'general' }))
  let post1 = await addPost(testPost({ feedId: feed }))
  let post2 = await addPost(testPost({ feedId: feed }))

  let popup1 = openTestPopup('post', post1)
  equal(openedPopups.get().length, 1)
  equal(openedPopups.get()[0], popup1)
  equal(popup1.name, 'post')
  equal(popup1.param, post1)
  equal(popup1.loading.get(), true)

  await waitLoading(popup1.loading)
  equal(checkLoadedPopup(popup1).post.get().id, post1)

  let popup2 = openTestPopup('post', post1)
  equal(openedPopups.get().length, 2)
  equal(popup1.loading.get(), false)
  equal(popup2.loading.get(), true)

  await waitLoading(popup2.loading)
  equal(popup1.loading.get(), false)
  equal(popup2.loading.get(), false)

  setBaseTestRoute({
    hash: `post=${post2},post=${post1}`,
    params: {},
    route: 'fast'
  })
  let popup3 = getPopup('post', 0)
  let popup4 = getPopup('post', 1)
  equal(popup3.loading.get(), true)
  equal(popup4.loading.get(), false)

  await waitLoading(popup3.loading)
  equal(checkLoadedPopup(popup3).post.get().id, post2)

  closeLastTestPopup()
  equal(openedPopups.get().length, 1)

  closeLastTestPopup()
  equal(openedPopups.get().length, 0)

  let popup5 = openTestPopup('post', 'unknown')
  equal(popup5.loading.get(), true)

  await waitLoading(popup5.loading)
  equal(popup5.notFound, true)
})
