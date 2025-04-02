import { cleanStores, keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  addPost,
  closeLastTestPopup,
  type FeedPopup,
  openedPopups,
  openTestPopup,
  type PostPopup,
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

test('opens feed', async () => {
  keepMount(openedPopups)
  equal(openedPopups.get().length, 0)
  let feed = await addFeed(testFeed({ categoryId: 'general' }))
  let post = await addPost(testPost({ feedId: feed }))

  openTestPopup('feed', feed)
  equal(openedPopups.get().length, 1)
  equal(openedPopups.get()[0]?.name, 'feed')
  equal(openedPopups.get()[0]?.param, feed)
  equal(openedPopups.get()[0]?.loading.get(), true)

  await waitLoading((openedPopups.get()[0] as FeedPopup).loading)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[0]?.notFound, false)
  equal((openedPopups.get()[0] as FeedPopup).feed.get().id, feed)

  closeLastTestPopup()
  equal(openedPopups.get().length, 0)

  openTestPopup('feed', 'unknown')
  equal(openedPopups.get().length, 1)
  equal(openedPopups.get()[0]?.loading.get(), true)

  await waitLoading((openedPopups.get()[0] as FeedPopup).loading)
  equal(openedPopups.get()[0]?.notFound, true)

  closeLastTestPopup()
  equal(openedPopups.get().length, 0)

  openTestPopup('feed', feed)
  await waitLoading((openedPopups.get()[0] as FeedPopup).loading)

  openTestPopup('post', post)
  equal(openedPopups.get().length, 2)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[1]?.loading.get(), true)

  await waitLoading((openedPopups.get()[1] as FeedPopup).loading)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[1]?.loading.get(), false)
  equal((openedPopups.get()[0] as FeedPopup).feed.get().id, feed)
  equal((openedPopups.get()[1] as PostPopup).post.get().id, post)
})
