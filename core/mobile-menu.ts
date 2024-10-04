import { atom } from 'nanostores'

import { fastCategories } from './fast.ts'
import { router } from './router.ts'
import { slowCategories } from './slow.ts'

export const isMenuOpened = atom<boolean>(false)

let targetRoutes = new Set(['fast', 'slow'])

export function openMenu(): void {
  if (router.get().route === 'slow') {
    let slowCategoriesValue = slowCategories.get()
    if (!slowCategoriesValue.isLoading && slowCategoriesValue.tree.length > 1) {
      isMenuOpened.set(true)
    }
  } else if (router.get().route === 'fast') {
    let fastCategoriesValue = fastCategories.get()
    if (
      !fastCategoriesValue.isLoading &&
      fastCategoriesValue.categories.length > 1
    ) {
      isMenuOpened.set(true)
    }
  } else if (!targetRoutes.has(router.get().route)) {
    isMenuOpened.set(true)
  }
}

export function closeMenu(): void {
  isMenuOpened.set(false)
}

router.subscribe((newRoute, prevRoute) => {
  if (
    prevRoute &&
    targetRoutes.has(newRoute.route) &&
    newRoute.route !== prevRoute.route
  ) {
    setTimeout(() => {
      openMenu()
    }, 0)
  } else if (newRoute.route === 'add' && targetRoutes.has(prevRoute!.route)) {
    setTimeout(() => {
      openMenu()
    }, 0)
  }
})
