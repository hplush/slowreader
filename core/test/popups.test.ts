import { cleanStores, keepMount } from 'nanostores'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  closeLastPopup,
  popupsStatus,
  testFeed,
  testPost
} from '../index.ts'
import { getPostPopupParam } from '../popups/post.ts'
import { cleanClientTest, enableClientTest, openTestPopup } from './utils.ts'

describe('popups', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
    cleanStores(popupsStatus)
  })

  test('generates popups status', async () => {
    keepMount(popupsStatus)
    deepEqual(popupsStatus.get(), {
      last: undefined,
      loading: undefined,
      notFound: undefined,
      other: []
    })

    let feed = await addFeed(testFeed({ categoryId: 'general' }))
    let post1 = await addPost(testPost({ feedId: feed }))
    let post2 = await addPost(testPost({ feedId: feed }))

    openTestPopup('post', getPostPopupParam({ id: post1 }))
    equal(popupsStatus.get().loading, true)
    equal(popupsStatus.get().notFound, false)
    equal(popupsStatus.get().other.length, 0)
    equal(popupsStatus.get().last?.name, 'post')
    ok(popupsStatus.get().last?.param.includes(post1))

    await setTimeout(10)
    equal(popupsStatus.get().loading, false)
    equal(popupsStatus.get().notFound, false)
    equal(popupsStatus.get().other.length, 0)
    equal(popupsStatus.get().last?.name, 'post')

    openTestPopup('post', getPostPopupParam({ id: post2 }))
    await setTimeout(10)
    equal(popupsStatus.get().loading, false)
    equal(popupsStatus.get().notFound, false)
    equal(popupsStatus.get().last?.name, 'post')
    ok(popupsStatus.get().last?.param.includes(post2))
    equal(popupsStatus.get().other.length, 1)
    ok(popupsStatus.get().other[0]?.param.includes(post1))

    openTestPopup('post', 'unknown')
    await setTimeout(10)
    equal(popupsStatus.get().loading, false)
    equal(popupsStatus.get().notFound, true)
    equal(popupsStatus.get().other.length, 2)
    equal(popupsStatus.get().last?.name, 'post')
    equal(popupsStatus.get().last?.param, 'unknown')

    closeLastPopup()
    equal(popupsStatus.get().other.length, 1)
    ok(popupsStatus.get().last?.param.includes(post2))
  })
})
