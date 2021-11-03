import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage
} from '@nanostores/persistent'
import { cleanStores, createStore, getValue, ReadableStore } from 'nanostores'
import { RouteParams, Page } from '@nanostores/router'
import { equal } from 'uvu/assert'
import { test } from 'uvu'

import { localSettings, createAppRouter, Routes } from '../index.js'

let testRouter = createStore<
  Page<Routes> | undefined,
  { routes: []; open(): void }
>(() => {
  testRouter.set({ route: 'home', params: {}, path: '' })
})

function changeBaseRoute<R extends keyof Routes>(
  route: R,
  ...params: RouteParams<Routes, R>
): void {
  testRouter.set({ route, params: params[0] ?? {}, path: '' } as Page)
}

test.before(() => {
  useTestStorageEngine()
})

let router: ReadableStore

test.before.each(() => {
  router = createAppRouter(testRouter)
})

test.after.each(() => {
  cleanStores(router, localSettings, testRouter)
  cleanTestStorage()
})

test('opens 404', () => {
  router.listen(() => {})
  testRouter.set(undefined)
  equal(getValue(router), {
    route: 'notFound',
    params: {},
    redirect: false
  })
})

test('transforms routers for guest', () => {
  router.listen(() => {})
  equal(getValue(router), {
    route: 'start',
    params: {},
    redirect: false
  })

  changeBaseRoute('slowAll')
  equal(getValue(router), {
    route: 'start',
    params: {},
    redirect: false
  })

  changeBaseRoute('signin')
  equal(getValue(router), {
    route: 'signin',
    params: {},
    redirect: false
  })
})

test('transforms routers for users', () => {
  router.listen(() => {})
  setTestStorageKey('slowreader:userId', '10')
  equal(getValue(router), {
    route: 'slowAll',
    params: {},
    redirect: true
  })

  changeBaseRoute('fast')
  equal(getValue(router), {
    route: 'fast',
    params: {},
    redirect: false
  })

  changeBaseRoute('home')
  equal(getValue(router), {
    route: 'slowAll',
    params: {},
    redirect: true
  })

  changeBaseRoute('signin')
  equal(getValue(router), {
    route: 'slowAll',
    params: {},
    redirect: true
  })

  setTestStorageKey('slowreader:userId', undefined)
  equal(getValue(router), {
    route: 'signin',
    params: {},
    redirect: false
  })
})

test.run()
