import { computed, type ReadableAtom, type WritableStore } from 'nanostores'

import { getEnvironment } from './environment.ts'
import { type Page, pages } from './pages/index.ts'
import { type Route, router } from './router.ts'

/**
 * Iterates over all parameters of a page, calling the iterator function 
 * for each parameter store and its corresponding value from the route
 */
function eachParam<SomeRoute extends Route>(
  page: Page<SomeRoute['route']>,
  route: SomeRoute,
  iterator: <Param extends keyof SomeRoute['params']>(
    store: WritableStore<SomeRoute['params'][Param]>,
    value: SomeRoute['params'][Param]
  ) => void
): void {
  let params = route.params as SomeRoute['params']
  for (let i in page.params) {
    let name = i as keyof SomeRoute['params']
    let value = params[name]
    // @ts-expect-error Too complex types for TS
    let store = page.params[name] as WritableStore<SomeRoute['params'][Param]>
    iterator(store, value)
  }
}

/**
 * Extracts current parameter values from all parameter stores of a page
 */
function getPageParams<SomeRoute extends Route>(
  page: Page<SomeRoute['route']>
): SomeRoute['params'] {
  let params = {} as SomeRoute['params']
  for (let i in page.params) {
    let name = i as keyof SomeRoute['params']
    // @ts-expect-error Too complex types for TS
    // eslint-disable-next-line
    params[name] = page.params[name].get()
  }
  return params
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

    eachParam(page, route, store => {
      unbinds.push(
        store.listen(() => {
          let currentRoute = router.get()
          if (currentRoute.route === page.route) {
            getEnvironment().openRoute({
              ...route,
              params: getPageParams(page)
            } as Route)
          }
        })
      )
    })
  }

  eachParam(page, route, (store, value) => {
    if (store.get() !== value) {
      store.set(value)
    }
  })

  return page
})
