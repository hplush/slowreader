import { cleanStores, keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  addPost,
  closeLastTestPopup,
  openedPopups,
  openTestPopup,
  type PostPopup,
  setBaseTestRoute,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { cleanClientTest, enableClientTest } from '../utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(openedPopups)
})

test('reacts on unknown popups', () => {
  keepMount(openedPopups)
  equal(openedPopups.get().length, 0)

  setBaseTestRoute({ hash: `unknown=id`, params: {}, route: 'fast' })
  equal(openedPopups.get().length, 0)

  setBaseTestRoute({ hash: `popup:id`, params: {}, route: 'fast' })
  equal(openedPopups.get().length, 0)
})

test('opens post', async () => {
  keepMount(openedPopups)
  let feed = await addFeed(testFeed({ categoryId: 'general' }))
  let post1 = await addPost(testPost({ feedId: feed }))
  let post2 = await addPost(testPost({ feedId: feed }))

  openTestPopup('post', post1)
  equal(openedPopups.get().length, 1)
  let postPopup = openedPopups.get()[0] as PostPopup
  equal(postPopup.name, 'post')
  equal(postPopup.param, post1)
  equal(postPopup.loading.get(), true)

  await waitLoading(postPopup.loading)
  equal(postPopup.loading.get(), false)
  equal(postPopup.notFound, false)
  equal(postPopup.post.get().id, post1)

  openTestPopup('post', post1)
  equal(openedPopups.get().length, 2)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[1]?.loading.get(), true)

  await waitLoading((openedPopups.get()[1] as PostPopup).loading)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[1]?.loading.get(), false)

  setBaseTestRoute({
    hash: `post=${post2},post=${post1}`,
    params: {},
    route: 'fast'
  })
  equal(openedPopups.get()[0]?.loading.get(), true)
  equal(openedPopups.get()[1]?.loading.get(), false)

  await waitLoading((openedPopups.get()[0] as PostPopup).loading)
  equal(openedPopups.get()[0]?.notFound, false)
  equal((openedPopups.get()[0] as PostPopup).post.get().id, post2)

  closeLastTestPopup()
  equal(openedPopups.get().length, 1)

  closeLastTestPopup()
  equal(openedPopups.get().length, 0)

  openTestPopup('post', 'unknown')
  equal(openedPopups.get()[0]?.loading.get(), true)

  await waitLoading((openedPopups.get()[0] as PostPopup).loading)
  equal(openedPopups.get()[0]?.notFound, true)
})
