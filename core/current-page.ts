import { computed, type ReadableAtom } from 'nanostores'

import { syncStatus } from './client.ts'
import { fatal, showCrash } from './errors.ts'
import { type Page, pages } from './pages/index.ts'
import { type RouteName, router } from './router.ts'
import { encryptionKeyLost } from './settings.ts'

let prevPage: Page<RouteName> | undefined

export const currentPage: ReadableAtom<Page<RouteName>> = computed(
  [router, syncStatus, fatal, encryptionKeyLost],
  (route, sync, fatalError, keyLost) => {
    let override: RouteName | undefined
    if (fatalError) {
      override = 'fatal'
    } else if (sync === 'wrongCredentials' || keyLost) {
      override = 'relogin'
    }
    let startRoute = override ?? route.route
    let page: Page<RouteName>
    try {
      page = pages[startRoute]()
    } catch (e) {
      if (startRoute === 'fatal') throw e
      showCrash(e)
      return pages.fatal()
    }
    // Page creation may call navigate() for redirect pages, re-check the route
    if (!override && startRoute !== router.get().route) {
      // The redirect could be applied before the creation finished, then
      // the page is already replaced and will never be the current one
      if (page !== prevPage) page.destroy()
      return currentPage.get()
    }

    if (page !== prevPage) {
      prevPage?.destroy()
      prevPage = page
    }

    return page
  }
)
