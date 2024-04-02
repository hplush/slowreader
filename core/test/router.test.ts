import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  addPost,
  deleteFeed,
  isFastRoute,
  isGuestRoute,
  isOtherRoute,
  isSlowRoute,
  removeFeedFromRoute,
  router,
  setBaseTestRoute,
  testFeed,
  testPost,
  userId
} from '../index.js'
import { cleanClientTest, enableClientTest } from './utils.js'

beforeEach(() => {
  enableClientTest()
})

afterEach(async () => {
  await cleanClientTest()
})

test('opens 404', () => {
  setBaseTestRoute(undefined)
  deepStrictEqual(router.get(), {
    params: {},
    route: 'notFound'
  })
})

test('transforms routers for guest', () => {
  userId.set(undefined)
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    route: 'start'
  })

  setBaseTestRoute({ params: {}, route: 'slow' })
  deepStrictEqual(router.get(), {
    params: {},
    route: 'start'
  })

  setBaseTestRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    route: 'signin'
  })
})

test('transforms routers for users', () => {
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: 'general' },
    route: 'fast'
  })

  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  setBaseTestRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  userId.set(undefined)
  deepStrictEqual(router.get(), {
    params: {},
    route: 'signin'
  })
})

test('transforms routers for users with feeds', async () => {
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  let id = await addFeed(testFeed())
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'slow'
  })

  setBaseTestRoute({ params: {}, route: 'welcome' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'slow'
  })

  setBaseTestRoute({ params: {}, route: 'home' })
  await deleteFeed(id)
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })
})

test('transforms settings to first settings page', () => {
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'settings' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'interface'
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
    redirect: true,
    route: 'fast'
  })
})

test('has routes groups', () => {
  userId.set(undefined)
  setBaseTestRoute({ params: {}, route: 'home' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), true)
  equal(isOtherRoute(router.get()), false)

  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'refresh' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: {}, route: 'slow' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), true)
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: { category: 'general' }, route: 'fast' })
  equal(isFastRoute(router.get()), true)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), false)

  setBaseTestRoute({ params: {}, route: 'profile' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
  equal(isOtherRoute(router.get()), true)

  setBaseTestRoute({ params: {}, route: 'categories' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
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
    route: 'fast'
  })

  setBaseTestRoute({ params: { category: idA, since: '1000' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: idA, since: 1000 },
    route: 'fast'
  })

  setBaseTestRoute({
    params: { category: idA, post, since: '1000' },
    route: 'fast'
  })
  deepStrictEqual(router.get(), {
    params: { category: idA, post, since: 1000 },
    route: 'fast'
  })
  await setTimeout(10)

  setBaseTestRoute({ params: { category: idA, since: '1000k' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: {},
    route: 'notFound'
  })
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
  deepStrictEqual(router.get(), {
    params: {},
    route: 'notFound'
  })

  setBaseTestRoute({ params: { category: idA, since: 100 }, route: 'fast' })
  await setTimeout(100)
  deepStrictEqual(router.get(), {
    params: { category: idA, since: 100 },
    route: 'fast'
  })
})

test('has helper on feed removing', async () => {
  userId.set('10')
  let feed = await addFeed(testFeed())
  setBaseTestRoute({ params: { feed }, route: 'categories' })

  removeFeedFromRoute()

  deepStrictEqual(router.get(), {
    params: {},
    route: 'categories'
  })
})
