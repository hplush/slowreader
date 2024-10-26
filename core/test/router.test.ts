import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  backToFirstStep,
  deleteFeed,
  isGuestRoute,
  isOtherRoute,
  router,
  setBaseTestRoute,
  testFeed,
  testPost,
  userId
} from '../index.ts'
import { cleanClientTest, enableClientTest } from './utils.ts'

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
  userId.set(undefined)
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'start' })

  setBaseTestRoute({ params: {}, route: 'slow' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'start' })

  setBaseTestRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'signin' })
})

test('transforms routers for users', () => {
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'welcome'
  })

  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: 'general' },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'welcome'
  })

  setBaseTestRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'welcome'
  })

  userId.set(undefined)
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'signin' })
})

test('transforms routers for users with feeds', async () => {
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'welcome'
  })

  let id = await addFeed(testFeed())
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'slow'
  })

  setBaseTestRoute({ params: {}, route: 'welcome' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'slow'
  })

  setBaseTestRoute({ params: {}, route: 'home' })
  await deleteFeed(id)
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'welcome'
  })
})

test('transforms section to first section page', () => {
  userId.set('10')

  setBaseTestRoute({ params: {}, route: 'settings' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    redirect: true,
    route: 'interface'
  })

  setBaseTestRoute({ params: {}, route: 'feeds' })
  deepStrictEqual(router.get(), {
    params: { candidate: undefined, url: undefined },
    popups: [],
    redirect: true,
    route: 'add'
  })
})

test('transforms routers to first fast category', async () => {
  userId.set('10')
  let idA = await addCategory({ title: 'A' })
  let idB = await addCategory({ title: 'B' })
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  await addFeed(testFeed({ categoryId: idB, reading: 'fast' }))

  setBaseTestRoute({ params: {}, route: 'fast' })
  await setTimeout(100)
  deepStrictEqual(router.get(), {
    params: { category: idA },
    popups: [],
    redirect: true,
    route: 'fast'
  })
})

test('has routes groups', () => {
  userId.set(undefined)
  setBaseTestRoute({ params: {}, route: 'home' })
  equal(isGuestRoute(router.get()), true)
  equal(isOtherRoute(router.get()), false)

  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'refresh' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: {}, route: 'slow' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: {}, route: 'profile' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), true)

  setBaseTestRoute({ params: {}, route: 'categories' })
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), true)
})

test('converts since to number', async () => {
  userId.set('10')
  let idA = await addCategory({ title: 'A' })
  let feed = await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  let post = await addPost(testPost({ feedId: feed }))
  await setTimeout(10)

  setBaseTestRoute({ params: { category: idA, since: 1000 }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: idA, since: 1000 },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({ params: { category: idA, since: '1000' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: idA, since: 1000 },
    popups: [],
    route: 'fast'
  })

  setBaseTestRoute({
    params: { category: idA, post, since: '1000' },
    route: 'fast'
  })
  deepStrictEqual(router.get(), {
    params: { category: idA, post, since: 1000 },
    popups: [],
    route: 'fast'
  })
  await setTimeout(10)

  setBaseTestRoute({ params: { category: idA, since: '1000k' }, route: 'fast' })
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'notFound' })
})

test('checks that category exists', async () => {
  userId.set('10')
  let idA = await addCategory({ title: 'A' })
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))

  setBaseTestRoute({
    params: { category: 'unknown', since: 100 },
    route: 'fast'
  })
  await setTimeout(100)
  deepStrictEqual(router.get(), { params: {}, popups: [], route: 'notFound' })

  setBaseTestRoute({ params: { category: idA, since: 100 }, route: 'fast' })
  await setTimeout(100)
  deepStrictEqual(router.get(), {
    params: { category: idA, since: 100 },
    popups: [],
    route: 'fast'
  })
})

test('backRoute handles export with format', () => {
  userId.set('10')
  setBaseTestRoute({ params: { format: 'opml' }, route: 'export' })

  backToFirstStep()

  deepStrictEqual(router.get(), {
    params: { format: undefined },
    popups: [],
    route: 'export'
  })
})

test('parses popups', () => {
  userId.set('10')
  setBaseTestRoute({ hash: 'feed=id1,post=id2', params: {}, route: 'profile' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [
      { param: 'id1', popup: 'feed' },
      { param: 'id2', popup: 'post' }
    ],
    route: 'profile'
  })

  setBaseTestRoute({ hash: 'broken,post=id', params: {}, route: 'profile' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [{ param: 'id', popup: 'post' }],
    route: 'profile'
  })

  setBaseTestRoute({
    hash: 'unknown=id1,post=id',
    params: {},
    route: 'profile'
  })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [{ param: 'id', popup: 'post' }],
    route: 'profile'
  })
})

test('hides popups for guest', () => {
  userId.set(undefined)
  setBaseTestRoute({ hash: 'feed=id1,post=id2', params: {}, route: 'profile' })
  deepStrictEqual(router.get(), {
    params: {},
    popups: [],
    route: 'start'
  })
})
