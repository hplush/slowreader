import { atom, computed } from 'nanostores'

import { fastCategories } from './fast.ts'
import { router } from './router.ts'
import { slowCategories } from './slow.ts'

const isMenuShowed = atom<boolean>(false)

const isMenuHasItems = computed(
  [router, fastCategories, slowCategories],
  (r, f, s) => {
    if (r.route === 'fast') {
      return !f.isLoading && f.categories.length > 1
    }

    if (r.route === 'slow') {
      return !s.isLoading && s.tree.length > 1
    }

    return true
  }
)

export function toggleMenu(): void {
  isMenuShowed.set(!isMenuShowed.get())
}

export const isMenuOpened = computed(
  [isMenuShowed, isMenuHasItems],
  (isShowed, isHasItems) => {
    return isShowed && isHasItems
  }
)

router.subscribe((newRoute, prevRoute) => {
  let targetRoutes = ['add', 'slow', 'fast']

  if (
    prevRoute &&
    targetRoutes.includes(newRoute.route) &&
    newRoute.route !== prevRoute.route
  ) {
    setTimeout(() => {
      isMenuShowed.set(true)
    }, 1)
  }
})
