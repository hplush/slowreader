import { atom } from 'nanostores'

import { fastCategories } from './fast.ts'
import { onNextRoute, router } from './router.ts'

export const isMenuOpened = atom<boolean>(false)

export function openMenu(): void {
  onNextRoute(() => {
    if (router.get().route === 'fast') {
      let fast = fastCategories.get()
      isMenuOpened.set(fast.isLoading || fast.categories.length > 1)
    } else {
      isMenuOpened.set(true)
    }
  })
}

export function closeMenu(): void {
  isMenuOpened.set(false)
}
