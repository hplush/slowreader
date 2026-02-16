import { keepMount } from 'nanostores'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addPopup,
  closeAllPopups,
  closeLastPopup,
  isOtherRoute,
  openedPopups,
  openedPost,
  openPopup,
  removeLastPopup,
  router,
  setPopups
} from '../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  setBaseTestRoute,
  setTestUser
} from './utils.ts'

describe('router', () => {
  beforeEach(() => {
    enableClientTest()
  })

  afterEach(async () => {
    await cleanClientTest()
  })

  test('opens 404', () => {
    setBaseTestRoute(undefined)
    deepEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
  })

  test('transforms routers for guest', () => {
    setTestUser(false)
    setBaseTestRoute({ params: {}, route: 'home' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'start' })

    setBaseTestRoute({ params: {}, route: 'slow' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'start' })

    setBaseTestRoute({ params: {}, route: 'signUp' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'signUp' })

    setBaseTestRoute(undefined)
    deepEqual(router.get(), { params: {}, popups: [], route: 'notFound' })

    setBaseTestRoute({ params: {}, route: 'notFound' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
  })

  test('transforms routers for users', () => {
    setTestUser()
    setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
    deepEqual(router.get(), {
      params: { category: 'general', from: undefined },
      popups: [],
      route: 'fast'
    })

    setBaseTestRoute({ params: {}, route: 'signUp' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'signUp' })

    setBaseTestRoute({ params: {}, route: 'start' })
    deepEqual(router.get(), {
      params: {},
      popups: [],
      redirect: true,
      route: 'home'
    })

    setTestUser(false)
    deepEqual(router.get(), { params: {}, popups: [], route: 'start' })
  })

  test('has routes groups', () => {
    setTestUser()

    setBaseTestRoute({ params: {}, route: 'slow' })
    equal(isOtherRoute(router.get()), false)

    setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
    equal(isOtherRoute(router.get()), false)

    setBaseTestRoute({ params: {}, route: 'cloud' })
    equal(isOtherRoute(router.get()), true)

    setBaseTestRoute({ params: {}, route: 'feedsByCategories' })
    equal(isOtherRoute(router.get()), true)
  })

  test('converts from to number', async () => {
    setTestUser()
    let idA = await addCategory({ title: 'A' })

    setBaseTestRoute({ params: { category: idA, from: 1000 }, route: 'fast' })
    deepEqual(router.get(), {
      params: { category: idA, from: 1000 },
      popups: [],
      route: 'fast'
    })

    setBaseTestRoute({ params: { category: idA, from: '1000' }, route: 'fast' })
    deepEqual(router.get(), {
      params: { category: idA, from: 1000 },
      popups: [],
      route: 'fast'
    })

    setBaseTestRoute({
      params: { category: idA, from: '1000k' },
      route: 'fast'
    })
    deepEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
  })

  test('has helpers for popups', () => {
    equal(
      addPopup({ params: {}, popups: [], route: 'about' }, 'feed', 'id1'),
      'feed=id1'
    )
    equal(addPopup(undefined, 'feed', 'id1'), 'feed=id1')
    equal(
      addPopup(
        {
          params: {},
          popups: [{ param: 'id1', popup: 'feed' }],
          route: 'about'
        },
        'post',
        'id2'
      ),
      'feed=id1,post=id2'
    )
    equal(
      addPopup(
        {
          params: {},
          popups: [{ param: 'id1', popup: 'post' }],
          route: 'about'
        },
        'post',
        'id2'
      ),
      'post=id2'
    )
    equal(removeLastPopup('feed=id1,post=id2'), 'feed=id1')
    equal(removeLastPopup('feed=id1'), '')

    setBaseTestRoute({ hash: '', params: {}, route: 'welcome' })
    openPopup('post', 'id1')
    deepEqual(router.get(), {
      params: {},
      popups: [{ param: 'id1', popup: 'post' }],
      route: 'welcome'
    })

    openPopup('post', 'id2')
    deepEqual(router.get(), {
      params: {},
      popups: [
        { param: 'id1', popup: 'post' },
        { param: 'id2', popup: 'post' }
      ],
      route: 'welcome'
    })

    setPopups([
      ['post', 'id2'],
      ['post', 'id1']
    ])
    deepEqual(router.get(), {
      params: {},
      popups: [
        { param: 'id2', popup: 'post' },
        { param: 'id1', popup: 'post' }
      ],
      route: 'welcome'
    })

    closeLastPopup()
    deepEqual(router.get(), {
      params: {},
      popups: [{ param: 'id2', popup: 'post' }],
      route: 'welcome'
    })

    closeLastPopup()
    deepEqual(router.get(), {
      params: {},
      popups: [],
      route: 'welcome'
    })

    closeLastPopup()
    deepEqual(router.get().popups, [])

    openPopup('post', 'id1')
    openPopup('post', 'id2')
    closeAllPopups()
    deepEqual(router.get(), {
      params: {},
      popups: [],
      route: 'welcome'
    })

    setBaseTestRoute({
      hash: 'feed=old',
      params: {},
      route: 'home'
    })
    addPopup(router.get(), 'feed', 'new')
    deepEqual(router.get().popups, [{ param: 'old', popup: 'feed' }])
  })

  test('supports # at the beginning of hash', () => {
    setTestUser()

    setBaseTestRoute({ hash: `#feed=id1`, params: {}, route: 'welcome' })
    deepEqual(router.get(), {
      params: {},
      popups: [{ param: 'id1', popup: 'feed' }],
      route: 'welcome'
    })
  })

  test('reacts on unknown popups', () => {
    setTestUser()
    keepMount(openedPopups)
    equal(openedPopups.get().length, 0)

    setBaseTestRoute({ hash: `unknown=id`, params: {}, route: 'fast' })
    equal(openedPopups.get().length, 0)

    setBaseTestRoute({ hash: `popup:id`, params: {}, route: 'fast' })
    equal(openedPopups.get().length, 0)
  })

  test('hides popups for guest', () => {
    setTestUser(false)
    setBaseTestRoute({ hash: 'post=id1,post=id2', params: {}, route: 'start' })
    equal(openedPopups.get().length, 0)
  })

  test('returns opened post', () => {
    setTestUser()
    equal(openedPost.get(), undefined)

    setBaseTestRoute({ hash: 'refresh=1,post=id2', params: {}, route: 'fast' })
    equal(openedPost.get(), undefined)

    setBaseTestRoute({ hash: 'post=id:2', params: {}, route: 'fast' })
    equal(openedPost.get(), '2')
  })
})
