import {
  cleanTestStorage,
  setTestStorageKey,
  useTestStorageEngine
} from '@nanostores/persistent'
import { atom, cleanStores, type ReadableAtom } from 'nanostores'
import { test } from 'uvu'
import { equal } from 'uvu/assert'

import {
  type AppRoute,
  type BaseRoute,
  createAppRouter,
  isFastRoute,
  isGuestRoute,
  isSlowRoute,
  type Routes,
  userId
} from '../index.js'

let testRouter = atom<BaseRoute | undefined>()

function changeBaseRoute<Name extends keyof Routes>(
  route: Name,
  params: Routes[Name]
): void {
  testRouter.set({ params, route } as BaseRoute)
}

test.before(() => {
  useTestStorageEngine()
})

let router: ReadableAtom<AppRoute>

test.before.each(() => {
  testRouter.set({ params: {}, route: 'home' } as BaseRoute)
  router = createAppRouter(testRouter)
})

test.after.each(() => {
  cleanStores(router, userId, testRouter)
  cleanTestStorage()
})

test('opens 404', () => {
  router.listen(() => {})
  testRouter.set(undefined)
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'notFound'
  })
})

test('transforms routers for guest', () => {
  router.listen(() => {})
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  changeBaseRoute('slowAll', {})
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  changeBaseRoute('signin', {})
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
  })
})

test('transforms routers for users', () => {
  router.listen(() => {})
  setTestStorageKey('slowreader:userId', '10')
  equal(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  changeBaseRoute('fast', {})
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'fast'
  })

  changeBaseRoute('home', {})
  equal(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  changeBaseRoute('signin', {})
  equal(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  setTestStorageKey('slowreader:userId', undefined)
  equal(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
  })
})

test('has routes groups', () => {
  router.listen(() => {})
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), true)

  setTestStorageKey('slowreader:userId', '10')
  changeBaseRoute('add', {})
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)

  changeBaseRoute('slowAll', {})
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), true)
  equal(isGuestRoute(router.get()), false)

  changeBaseRoute('fast', {})
  equal(isFastRoute(router.get()), true)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
})

test.run()
