import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  isFastRoute,
  isGuestRoute,
  isSlowRoute,
  router,
  setupEnvironment,
  userId
} from '../index.js'
import { getTestEnvironment, setBaseRoute, testRouter } from './utils.js'

test.before.each(() => {
  setupEnvironment({
    ...getTestEnvironment(),
    baseRouter: testRouter
  })
})

test.after.each(() => {
  setupEnvironment(getTestEnvironment())
})

test('opens 404', () => {
  setBaseRoute(undefined)
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'notFound'
  })
})

test('transforms routers for guest', () => {
  userId.set(undefined)
  setBaseRoute({ params: {}, route: 'home' })
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  setBaseRoute({ params: {}, route: 'slowAll' })
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  setBaseRoute({ params: {}, route: 'signin' })
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
  })
})

test('transforms routers for users', () => {
  userId.set('10')
  setBaseRoute({ params: {}, route: 'home' })
  equal(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  setBaseRoute({ params: {}, route: 'fast' })
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'fast'
  })

  setBaseRoute({ params: {}, route: 'home' })
  equal(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  setBaseRoute({ params: {}, route: 'signin' })
  equal(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  userId.set(undefined)
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
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

test.run()
