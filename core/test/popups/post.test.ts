import { cleanStores, keepMount } from 'nanostores'
import { deepEqual, equal, match } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addFeed,
  addPost,
  closeLastPopup,
  GENERAL_CATEGORY,
  loadPost,
  openedPopups,
  type OriginPost,
  type PostValue,
  testFeed,
  testPost,
  waitLoading
} from '../../index.ts'
import { getPostPopupParam } from '../../popups/post.ts'
import {
  checkLoadedPopup,
  cleanClientTest,
  enableClientTest,
  getPopup,
  openTestPopup,
  setBaseTestRoute
} from '../utils.ts'

describe('post popup', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
    cleanStores(openedPopups)
  })

  test('opens saved post', async () => {
    keepMount(openedPopups)
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let id1 = await addPost(testPost({ feedId: feed }))
    let id2 = await addPost(testPost({ feedId: feed, publishedAt: undefined }))

    let popup1 = openTestPopup('post', getPostPopupParam({ id: id1 }))
    equal(openedPopups.get().length, 1)
    equal(openedPopups.get()[0], popup1)
    equal(popup1.name, 'post')
    equal(popup1.loading.get(), true)

    await waitLoading(popup1.loading)
    equal((checkLoadedPopup(popup1).post.get() as PostValue).id, id1)
    match(checkLoadedPopup(popup1).publishedAt.get()!, /1\/1\/70/)
    equal(checkLoadedPopup(popup1).feed!.get().id, feed)
    equal(checkLoadedPopup(popup1).read, undefined)

    let popup2 = openTestPopup('post', getPostPopupParam({ id: id1 }))
    equal(openedPopups.get().length, 2)
    equal(popup1.loading.get(), false)
    equal(popup2.loading.get(), true)

    await waitLoading(popup2.loading)
    equal(popup1.loading.get(), false)
    equal(popup2.loading.get(), false)

    setBaseTestRoute({
      hash:
        `post=${getPostPopupParam({ id: id2 })},` +
        `post=${getPostPopupParam({ id: id1 })}`,
      params: {},
      route: 'fast'
    })
    let popup3 = getPopup('post', 0)
    let popup4 = getPopup('post', 1)
    equal(popup3.loading.get(), true)
    equal(popup4.loading.get(), false)

    await waitLoading(popup3.loading)
    equal((checkLoadedPopup(popup3).post.get() as PostValue).id, id2)
    equal(checkLoadedPopup(popup3).publishedAt.get(), undefined)

    closeLastPopup()
    equal(openedPopups.get().length, 1)

    closeLastPopup()
    equal(openedPopups.get().length, 0)

    let popup5 = openTestPopup('post', 'id:unknown')
    equal(popup5.loading.get(), true)

    await waitLoading(popup5.loading)
    equal(popup5.notFound, true)
  })

  test('read saved post', async () => {
    let feed = await addFeed(testFeed({ categoryId: GENERAL_CATEGORY }))
    let id1 = await addPost(testPost({ feedId: feed }))
    let id2 = await addPost(testPost({ feedId: feed }))

    let popup = openTestPopup('post', getPostPopupParam({ id: id1 }, true))
    await waitLoading(popup.loading)
    equal((await loadPost(id1))!.read, 0)
    equal((await loadPost(id2))!.read, 0)

    checkLoadedPopup(popup).read!.set(true)
    await setTimeout(1)
    equal((await loadPost(id1))!.read, 1)
    equal((await loadPost(id2))!.read, 0)

    checkLoadedPopup(popup).read!.set(false)
    await setTimeout(1)
    equal((await loadPost(id1))!.read, 0)
    equal((await loadPost(id2))!.read, 0)
  })

  test('opens candidate post', async () => {
    let post: OriginPost = { originId: 'id', title: 'test' }
    let data = getPostPopupParam(post)

    let popup = openTestPopup('post', data)
    await waitLoading(popup.loading)
    deepEqual(checkLoadedPopup(popup).post.get(), post)
    deepEqual(checkLoadedPopup(popup).read, undefined)
    equal(checkLoadedPopup(popup).feed, undefined)

    let broken1 = openTestPopup('post', 'data:aaa')
    await waitLoading(broken1.loading)
    equal(broken1.notFound, true)

    let broken2 = openTestPopup('post', 'aaa')
    await waitLoading(broken2.loading)
    equal(broken2.notFound, true)
  })
})
