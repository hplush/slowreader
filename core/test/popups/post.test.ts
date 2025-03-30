import { cleanStores, keepMount } from 'nanostores'
import { equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  openedPopups,
  type PostPopup,
  setBaseTestRoute,
  testFeed,
  testPost
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

  setBaseTestRoute({ hash: `post=${post1}`, params: {}, route: 'fast' })
  equal(openedPopups.get().length, 1)
  equal(openedPopups.get()[0]?.name, 'post')
  equal(openedPopups.get()[0]?.param, post1)
  equal(openedPopups.get()[0]?.loading.get(), true)

  await setTimeout(100)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[0]?.notFound, false)
  equal((openedPopups.get()[0] as PostPopup).post.get().id, post1)

  setBaseTestRoute({
    hash: `post=${post1},post=${post1}`,
    params: {},
    route: 'fast'
  })
  equal(openedPopups.get().length, 2)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[1]?.loading.get(), true)

  await setTimeout(100)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[1]?.loading.get(), false)

  setBaseTestRoute({
    hash: `post=${post2},post=${post1}`,
    params: {},
    route: 'fast'
  })
  equal(openedPopups.get()[0]?.loading.get(), true)
  equal(openedPopups.get()[1]?.loading.get(), false)

  await setTimeout(100)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[0]?.notFound, false)
  equal((openedPopups.get()[0] as PostPopup).post.get().id, post2)

  setBaseTestRoute({
    hash: `post=unknown`,
    params: {},
    route: 'fast'
  })
  equal(openedPopups.get()[0]?.loading.get(), true)

  await setTimeout(100)
  equal(openedPopups.get()[0]?.loading.get(), false)
  equal(openedPopups.get()[0]?.notFound, true)
})
