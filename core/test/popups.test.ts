import { cleanStores, keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  closeLastPopup,
  popupsStatus,
  testFeed,
  testPost
} from '../index.ts'
import { cleanClientTest, enableClientTest, openTestPopup } from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
  cleanStores(popupsStatus)
})

test('generates popups status', async () => {
  keepMount(popupsStatus)
  deepStrictEqual(popupsStatus.get(), {
    last: undefined,
    loading: undefined,
    notFound: undefined,
    other: []
  })

  let feed = await addFeed(testFeed({ categoryId: 'general' }))
  let post1 = await addPost(testPost({ feedId: feed }))
  let post2 = await addPost(testPost({ feedId: feed }))

  openTestPopup('post', post1)
  equal(popupsStatus.get().loading, true)
  equal(popupsStatus.get().notFound, false)
  equal(popupsStatus.get().other.length, 0)
  equal(popupsStatus.get().last?.name, 'post')
  equal(popupsStatus.get().last?.param, post1)

  await setTimeout(10)
  equal(popupsStatus.get().loading, false)
  equal(popupsStatus.get().notFound, false)
  equal(popupsStatus.get().other.length, 0)
  equal(popupsStatus.get().last?.name, 'post')

  openTestPopup('post', post2)
  await setTimeout(10)
  equal(popupsStatus.get().loading, false)
  equal(popupsStatus.get().notFound, false)
  equal(popupsStatus.get().last?.name, 'post')
  equal(popupsStatus.get().last?.param, post2)
  equal(popupsStatus.get().other.length, 1)
  equal(popupsStatus.get().other[0]?.param, post1)

  openTestPopup('post', 'unknown')
  await setTimeout(10)
  equal(popupsStatus.get().loading, false)
  equal(popupsStatus.get().notFound, true)
  equal(popupsStatus.get().other.length, 2)
  equal(popupsStatus.get().last?.name, 'post')
  equal(popupsStatus.get().last?.param, 'unknown')

  closeLastPopup()
  equal(popupsStatus.get().other.length, 1)
  equal(popupsStatus.get().last?.param, post2)
})
