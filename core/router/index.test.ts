import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage
} from '@nanostores/persistent'
import { cleanStores, createStore, getValue, ReadableStore } from 'nanostores'
import { RouteParams, Page } from '@nanostores/router'

import { localSettings, createAppRouter, Routes } from '../'

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

let router: ReadableStore

beforeAll(() => {
  useTestStorageEngine()
})

afterEach(() => {
  cleanStores(router, localSettings, testRouter)
  cleanTestStorage()
})

beforeEach(() => {
  router = createAppRouter(testRouter)
})

it('opens 404', () => {
  router.listen(() => {})
  testRouter.set(undefined)
  expect(getValue(router)).toEqual({
    route: 'notFound',
    params: {},
    redirect: false
  })
})

it('transforms routers for guest', () => {
  router.listen(() => {})
  expect(getValue(router)).toEqual({
    route: 'start',
    params: {},
    redirect: false
  })

  changeBaseRoute('slowAll')
  expect(getValue(router)).toEqual({
    route: 'start',
    params: {},
    redirect: false
  })

  changeBaseRoute('signin')
  expect(getValue(router)).toEqual({
    route: 'signin',
    params: {},
    redirect: false
  })
})

it('transforms routers for users', () => {
  router.listen(() => {})
  setTestStorageKey('slowreader:userId', '10')
  expect(getValue(router)).toEqual({
    route: 'slowAll',
    params: {},
    redirect: true
  })

  changeBaseRoute('fast')
  expect(getValue(router)).toEqual({
    route: 'fast',
    params: {},
    redirect: false
  })

  changeBaseRoute('home')
  expect(getValue(router)).toEqual({
    route: 'slowAll',
    params: {},
    redirect: true
  })

  changeBaseRoute('signin')
  expect(getValue(router)).toEqual({
    route: 'slowAll',
    params: {},
    redirect: true
  })

  setTestStorageKey('slowreader:userId', undefined)
  expect(getValue(router)).toEqual({
    route: 'signin',
    params: {},
    redirect: false
  })
})
