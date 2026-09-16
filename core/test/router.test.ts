import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  addCategory,
  addPopup,
  closeAllPopups,
  closeLastPopup,
  GENERAL_CATEGORY,
  isOtherRoute,
  openedPopups,
  openedPost,
  openPopup,
  removeLastPopup,
  router,
  setPopups
} from '../index.ts'
import { cleanClient, startClient, openRoute, setTestUser } from './utils.ts'

describe('router', () => {
  beforeEach(() => {
    startClient()
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('opens 404', () => {
    openRoute(undefined)
    deepEqual(router.get(), { params: {}, popups: [], route: 'fatal' })
  })

  test('transforms routers for guest', () => {
    setTestUser(false)
    openRoute({ params: {}, route: 'home' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'start' })

    openRoute({ params: {}, route: 'slow' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'start' })

    openRoute({ params: {}, route: 'signUp' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'signUp' })

    openRoute(undefined)
    deepEqual(router.get(), { params: {}, popups: [], route: 'fatal' })

    openRoute({ params: {}, route: 'fatal' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'fatal' })
  })

  test('transforms routers for users', () => {
    setTestUser()
    openRoute({ params: { category: GENERAL_CATEGORY }, route: 'fast' })
    deepEqual(router.get(), {
      params: { category: GENERAL_CATEGORY, from: undefined },
      popups: [],
      route: 'fast'
    })

    openRoute({ params: {}, route: 'signUp' })
    deepEqual(router.get(), { params: {}, popups: [], route: 'signUp' })

    openRoute({ params: {}, route: 'start' })
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

    openRoute({ params: {}, route: 'slow' })
    equal(isOtherRoute(router.get()), false)

    openRoute({ params: { category: GENERAL_CATEGORY }, route: 'fast' })
    equal(isOtherRoute(router.get()), false)

    openRoute({ params: {}, route: 'cloud' })
    equal(isOtherRoute(router.get()), true)

    openRoute({ params: {}, route: 'feedsByCategories' })
    equal(isOtherRoute(router.get()), true)
  })

  test('validates from', async () => {
    setTestUser()
    let idA = await addCategory({ title: 'A' })

    openRoute({ params: { category: idA, from: 1000 }, route: 'fast' })
    deepEqual(router.get(), {
      params: { category: idA, from: '1000' },
      popups: [],
      route: 'fast'
    })

    openRoute({
      params: { category: idA, from: '1000:post' },
      route: 'fast'
    })
    deepEqual(router.get(), {
      params: { category: idA, from: '1000:post' },
      popups: [],
      route: 'fast'
    })

    openRoute({
      params: { category: idA, from: '1000k' },
      route: 'fast'
    })
    deepEqual(router.get(), { params: {}, popups: [], route: 'fatal' })
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

    openRoute({ hash: '', params: {}, route: 'welcome' })
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

    openRoute({
      hash: 'feed=old',
      params: {},
      route: 'home'
    })
    addPopup(router.get(), 'feed', 'new')
    deepEqual(router.get().popups, [{ param: 'old', popup: 'feed' }])
  })

  test('supports # at the beginning of hash', () => {
    setTestUser()

    openRoute({ hash: `#feed=id1`, params: {}, route: 'welcome' })
    deepEqual(router.get(), {
      params: {},
      popups: [{ param: 'id1', popup: 'feed' }],
      route: 'welcome'
    })
  })

  test('reacts on unknown popups', () => {
    setTestUser()
    equal(openedPopups.get().length, 0)

    openRoute({ hash: `unknown=id`, params: {}, route: 'fast' })
    equal(openedPopups.get().length, 0)

    openRoute({ hash: `popup:id`, params: {}, route: 'fast' })
    equal(openedPopups.get().length, 0)
  })

  test('hides popups for guest', () => {
    setTestUser(false)
    openRoute({ hash: 'post=id1,post=id2', params: {}, route: 'start' })
    equal(openedPopups.get().length, 0)
  })

  test('returns opened post', () => {
    setTestUser()
    equal(openedPost.get(), undefined)

    openRoute({ hash: 'refresh=1,post=id2', params: {}, route: 'about' })
    equal(openedPost.get(), undefined)

    openRoute({ hash: 'post=id:2', params: {}, route: 'about' })
    equal(openedPost.get(), '2')
  })
})
