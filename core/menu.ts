import { delay } from 'nanodelay'
import { atom } from 'nanostores'

import { fastCategories } from './fast.ts'
import { router } from './router.ts'

export const isMenuOpened = atom<boolean>(false)

export async function openMenu(): Promise<void> {
  await delay(1)
  if (router.get().route === 'fast') {
    let fast = fastCategories.get()
    isMenuOpened.set(fast.isLoading || fast.categories.length > 1)
  } else {
    isMenuOpened.set(true)
  }
}

export function closeMenu(): void {
  isMenuOpened.set(false)
}
