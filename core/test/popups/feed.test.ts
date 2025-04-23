import { cleanStores, keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  addPost,
  closeLastPopup,
  type FeedPopup,
  openedPopups,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import {
  checkLoadedPopup,
  cleanClientTest,
  enableClientTest,
  openTestPopup
} from '../utils.ts'

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

  let popup = openTestPopup('feed', feed)
  equal(openedPopups.get().length, 1)
  equal(popup.name, 'feed')
  equal(popup.param, feed)
  equal(popup.loading.get(), true)

  await waitLoading(popup.loading)
  equal(popup.loading.get(), false)
  equal(popup.notFound, false)
  equal((openedPopups.get()[0] as FeedPopup).feed.get().id, feed)

  closeLastPopup()
  equal(openedPopups.get().length, 0)

  let unknown = openTestPopup('feed', 'unknown')
  equal(unknown.loading.get(), true)

  await waitLoading(unknown.loading)
  equal(unknown.notFound, true)

  closeLastPopup()
  equal(openedPopups.get().length, 0)

  let feedPopup = openTestPopup('feed', feed)
  await waitLoading(feedPopup.loading)

  let postPopup = openTestPopup('post', post)
  equal(openedPopups.get().length, 2)
  equal(feedPopup.loading.get(), false)
  equal(postPopup.loading.get(), true)

  await waitLoading(postPopup.loading)
  equal(checkLoadedPopup(feedPopup).feed.get().id, feed)
  equal(checkLoadedPopup(postPopup).post.get().id, post)
})
