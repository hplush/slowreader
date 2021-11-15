import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage
} from '@nanostores/persistent'
import { cleanStores, atom, ReadableAtom } from 'nanostores'
import { RouteParams, Page } from '@nanostores/router'
import { equal, is } from 'uvu/assert'
import { test } from 'uvu'

import {
  createAppRouter,
  localSettings,
  isFastRoutes,
  isSlowRoutes,
  AppRoute,
  Routes
} from '../index.js'

let testRouter = atom<Page<Routes> | undefined, { routes: []; open(): void }>()

function changeBaseRoute<R extends keyof Routes>(
  route: R,
  ...params: RouteParams<Routes, R>
): void {
  testRouter.set({ route, params: params[0] ?? {}, path: '' } as Page)
}

test.before(() => {
  useTestStorageEngine()
})

let router: ReadableAtom<AppRoute>

test.before.each(() => {
  testRouter.set({ route: 'home', params: {}, path: '' })
  router = createAppRouter(testRouter)
})

test.after.each(() => {
  cleanStores(router, localSettings, testRouter)
  cleanTestStorage()
})

test('opens 404', () => {
  router.listen(() => {})
  testRouter.set(undefined)
  equal(router.get(), {
    route: 'notFound',
    params: {},
    redirect: false
  })
})

test('transforms routers for guest', () => {
  router.listen(() => {})
  equal(router.get(), {
    route: 'start',
    params: {},
    redirect: false
  })

  changeBaseRoute('slowAll')
  equal(router.get(), {
    route: 'start',
    params: {},
    redirect: false
  })

  changeBaseRoute('signin')
  equal(router.get(), {
    route: 'signin',
    params: {},
    redirect: false
  })
})

test('transforms routers for users', () => {
  router.listen(() => {})
  setTestStorageKey('slowreader:userId', '10')
  equal(router.get(), {
    route: 'slowAll',
    params: {},
    redirect: true
  })

  changeBaseRoute('fast')
  equal(router.get(), {
    route: 'fast',
    params: {},
    redirect: false
  })

  changeBaseRoute('home')
  equal(router.get(), {
    route: 'slowAll',
    params: {},
    redirect: true
  })

  changeBaseRoute('signin')
  equal(router.get(), {
    route: 'slowAll',
    params: {},
    redirect: true
  })

  setTestStorageKey('slowreader:userId', undefined)
  equal(router.get(), {
    route: 'signin',
    params: {},
    redirect: false
  })
})

test('has routes groups', () => {
  router.listen(() => {})
  setTestStorageKey('slowreader:userId', '10')
  changeBaseRoute('add')
  is(isFastRoutes(router.get()), false)
  is(isSlowRoutes(router.get()), false)

  changeBaseRoute('slowAll')
  is(isFastRoutes(router.get()), false)
  is(isSlowRoutes(router.get()), true)

  changeBaseRoute('fast')
  is(isFastRoutes(router.get()), true)
  is(isSlowRoutes(router.get()), false)
})

test.run()
