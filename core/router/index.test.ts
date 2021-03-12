import {
  cleanStores,
  RouteParams,
  createStore,
  getValue,
  Page
} from '@logux/state'

import {
  setLocalSettingsStorage,
  localSettings,
  setBaseRouter,
  Routes,
  router
} from '../'

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

afterEach(() => {
  cleanStores(router, localSettings, testRouter)
})

beforeEach(() => {
  setLocalSettingsStorage(testStorage)
  setBaseRouter(testRouter)
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
  storageListener('userId', '10')
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

  storageListener('userId', undefined)
  expect(getValue(router)).toEqual({
    route: 'signin',
    params: {},
    redirect: false
  })
})
