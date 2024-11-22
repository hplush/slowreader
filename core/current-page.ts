import { computed, type ReadableAtom, type WritableStore } from 'nanostores'

import { getEnvironment } from './environment.ts'
import { type Page, pages } from './pages/index.ts'
import { type Route, router } from './router.ts'

function isStore(store: unknown): store is WritableStore {
  return typeof store === 'object' && store !== null && 'listen' in store
}

function eachParam<SomeRoute extends Route>(
  page: Page<SomeRoute['route']>,
  route: SomeRoute,
  iterator: <Param extends keyof SomeRoute['params']>(
    store: WritableStore<SomeRoute['params'][Param]>,
    name: Param,
    value: SomeRoute['params'][Param]
  ) => void
): void {
  let params = route.params as SomeRoute['params']
  for (let i in params) {
    let name = i as keyof SomeRoute['params']
    let value = params[name]
    let store = page[name]
    if (isStore(store)) {
      iterator(store, name, value)
    }
  }
}

function changeRouteParam(
  route: Route,
  change: Partial<Route['params']>
): void {
  getEnvironment().openRoute({
    ...route,
    params: {
      ...route.params,
      ...change
    }
  } as Route)
}

let prevPage: Page | undefined
let unbinds: (() => void)[] = []

export const currentPage: ReadableAtom<Page> = computed(router, route => {
  let page = pages[route.route]() as Page
  if (page !== prevPage) {
    if (prevPage) {
      for (let unbind of unbinds) unbind()
      prevPage.destroy()
    }
    prevPage = page

    eachParam(page, route, (store, param) => {
      unbinds.push(
        store.listen(newValue => {
          let currentRoute = router.get()
          if (currentRoute.route === page.route) {
            changeRouteParam(currentRoute, { [param]: newValue })
          }
        })
      )
    })
  }

  eachParam(page, route, (store, param, value) => {
    if (store.get() !== value) {
      store.set(value)
    }
  })

  return page
})
