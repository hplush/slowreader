import { keepMount } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addCategory,
  addPopup,
  closeAllPopups,
  closeLastPopup,
  isGuestRoute,
  isOtherRoute,
  openedPopups,
  openPopup,
  removeLastPopup,
  router
} from '../index.ts'
import {
  cleanClientTest,
  enableClientTest,
  setBaseTestRoute,
  setTestUser
} from './utils.ts'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('opens 404', () => {
  setBaseTestRoute(undefined)
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
})

test('transforms routers for guest', () => {
  setTestUser(false)
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'start' })

  setBaseTestRoute({ params: {}, route: 'slow' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'start' })

  setBaseTestRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'signin' })

  setBaseTestRoute({ params: {}, route: 'signup' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'signup' })
})

test('transforms routers for users', () => {
  setTestUser()
  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: 'general', reader: undefined, since: undefined },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({ params: {}, route: 'signup' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'signup' })

  setBaseTestRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'home'
  })

  setTestUser(false)
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'signin' })
})

test('has routes groups', () => {
  setTestUser(false)
  setBaseTestRoute({ params: {}, route: 'home' })
  equal(isGuestRoute(router.get()), true)
  equal(isOtherRoute(router.get()), false)

  setTestUser()

  setBaseTestRoute({ params: {}, route: 'slow' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: {}, route: 'profile' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), true)

  setBaseTestRoute({ params: {}, route: 'feedsByCategories' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), true)
})

test('converts since to number', async () => {
  setTestUser()
  let idA = await addCategory({ title: 'A' })

  setBaseTestRoute({ params: { category: idA, since: 1000 }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: idA, reader: undefined, since: 1000 },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({ params: { category: idA, since: '1000' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: idA, reader: undefined, since: 1000 },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({
    params: { category: idA, reader: undefined, since: '1000k' },
    route: 'fast'
  })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
})

test('checks reader values', async () => {
  setTestUser()
  let idA = await addCategory({ title: 'A' })

  setBaseTestRoute({
    params: { category: idA, reader: 'feed' },
    route: 'fast'
  })
  deepStrictEqual(router.get(), {
    params: { category: idA, reader: 'feed', since: undefined },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({
    params: { category: idA, reader: 'list' },
    route: 'fast'
  })
  deepStrictEqual(router.get(), {
    params: { category: idA, reader: 'list', since: undefined },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({
    params: { category: idA },
    route: 'fast'
  })
  deepStrictEqual(router.get(), {
    params: { category: idA, reader: undefined, since: undefined },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({
    params: { category: idA, reader: 'unknown' },
    route: 'fast'
  })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
})

test('has helpers for popups', () => {
  equal(addPopup('', 'feed', 'id1'), 'feed=id1')
  equal(addPopup('feed=id1', 'post', 'id2'), 'feed=id1,post=id2')
  equal(removeLastPopup('feed=id1,post=id2'), 'feed=id1')
  equal(removeLastPopup('feed=id1'), '')

  setBaseTestRoute({ hash: '', params: {}, route: 'welcome' })
  openPopup('post', 'id1')
  deepStrictEqual(router.get(), {
    params: {},
    popups: [{ param: 'id1', popup: 'post' }],
    route: 'welcome'
  })

  openPopup('post', 'id2')
  deepStrictEqual(router.get(), {
    params: {},
    popups: [
      { param: 'id1', popup: 'post' },
      { param: 'id2', popup: 'post' }
    ],
    route: 'welcome'
  })

  closeLastPopup()
  deepStrictEqual(router.get(), {
    params: {},
    popups: [{ param: 'id1', popup: 'post' }],
    route: 'welcome'
  })

  closeLastPopup()
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    route: 'welcome'
  })

  closeLastPopup()
  deepStrictEqual(router.get().popups, [])

  openPopup('post', 'id1')
  openPopup('post', 'id2')
  closeAllPopups()
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
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
  setBaseTestRoute({ hash: 'feed=id1,post=id2', params: {}, route: 'signin' })
  equal(openedPopups.get().length, 0)
})
