import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'

import {
  addFeed,
  deleteFeed,
  isFastRoute,
  isGuestRoute,
  isSlowRoute,
  router,
  userId
} from '../index.js'
import {
  cleanClientTest,
  enableClientTest,
  setBaseRoute,
  testRouter
} from './utils.js'

beforeEach(() => {
  enableClientTest({
    baseRouter: testRouter
  })
})

afterEach(async () => {
  await cleanClientTest()
})

test('opens 404', () => {
  setBaseRoute(undefined)
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'notFound'
  })
})

test('transforms routers for guest', () => {
  userId.set(undefined)
  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  setBaseRoute({ params: {}, route: 'slowAll' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  setBaseRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
  })
})

test('transforms routers for users', () => {
  userId.set('10')
  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  setBaseRoute({ params: {}, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'fast'
  })

  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  setBaseRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  userId.set(undefined)
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
  })
})

test('transforms routers for users with feeds', async () => {
  userId.set('10')
  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  let id = await addFeed({
    loader: 'rss',
    reading: 'slow',
    title: 'Test',
    url: 'https://example.com'
  })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  setBaseRoute({ params: {}, route: 'welcome' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  setBaseRoute({ params: {}, route: 'home' })
  await deleteFeed(id)
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })
})

test('has routes groups', () => {
  userId.set(undefined)
  setBaseRoute({ params: {}, route: 'home' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), true)

  userId.set('10')
  setBaseRoute({ params: {}, route: 'add' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)

  setBaseRoute({ params: {}, route: 'slowAll' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), true)
  equal(isGuestRoute(router.get()), false)

  setBaseRoute({ params: {}, route: 'fast' })
  equal(isFastRoute(router.get()), true)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
})
