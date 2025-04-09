import { computed, type ReadableAtom, type WritableStore } from 'nanostores'

import { getEnvironment } from './environment.ts'
import { type Page, pages } from './pages/index.ts'
import { type Route, router } from './router.ts'

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
  for (let i in page.params) {
    let name = i as keyof SomeRoute['params']
    let value = params[name]
    // @ts-expect-error Too complex types for TS
    let store = page.params[name] as WritableStore<SomeRoute['params'][Param]>
    iterator(store, name, value)
  }
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
            getEnvironment().openRoute({
              ...route,
              params: {
                ...route.params,
                [param]: newValue
              }
            } as Route)
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
