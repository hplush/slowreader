import {
  cleanStores,
  RouteParams,
  CurrentPage,
  LocalStore,
  change
} from '@logux/state'
import { delay } from 'nanodelay'

import { Router, LocalSettings, Routes } from '../'

class TestRouter extends LocalStore {
  page: CurrentPage<Routes> = { name: 'home', params: {} }
  change<N extends keyof Routes> (name: N, ...params: RouteParams<Routes, N>) {
    this[change]('page', { name, params: params[0] } as CurrentPage)
  }
}

let storageListener: (key: string, value: string | undefined) => void = () => {}
let testStorage = {
  get: () => undefined,
  set: () => undefined,
  delete: () => undefined,
  subscribe: (cb: (key: string, value: string | undefined) => void) => {
    storageListener = cb
    return () => {
      storageListener = () => {}
    }
  }
}

afterEach(async () => {
  await cleanStores(Router, LocalSettings, TestRouter)
})

beforeEach(() => {
  LocalSettings.storage = testStorage
  Router.Base = TestRouter
})

it('throws on missed base router', () => {
  Router.Base = undefined
  expect(() => {
    Router.load()
  }).toThrow('Set Router.Base')
})

it('transforms routers for guest', async () => {
  let base = TestRouter.load()
  let router = Router.load()
  expect(router.page.name).toEqual('start')
  expect(router.redirect).toBe(false)

  base.change('slowAll')
  await delay(1)
  expect(router.page.name).toEqual('start')
  expect(router.redirect).toBe(false)

  base.change('signin')
  await delay(1)
  expect(router.page.name).toEqual('signin')
  expect(router.redirect).toBe(false)
})

it('transforms routers for users', async () => {
  let base = TestRouter.load()
  let router = Router.load()
  storageListener('userId', '10')
  await delay(1)
  expect(router.page.name).toEqual('slowAll')
  expect(router.redirect).toBe(true)

  base.change('fast')
  await delay(1)
  expect(router.page.name).toEqual('fast')
  expect(router.redirect).toBe(false)

  base.change('home')
  await delay(1)
  expect(router.page.name).toEqual('slowAll')
  expect(router.redirect).toBe(true)

  base.change('signin')
  await delay(1)
  expect(router.page.name).toEqual('slowAll')
  expect(router.redirect).toBe(true)

  storageListener('userId', undefined)
  await delay(1)
  expect(router.page.name).toEqual('signin')
})
