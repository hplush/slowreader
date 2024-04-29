import { router } from '@slowreader/core'
import { atom } from 'nanostores'

interface BackRoutes {
  [key: string]: string
}

export const backRoutes: BackRoutes = {
  add: '/feeds/add',
  categories: '/feeds/categories',
  fast: '/fast/:category',
  slow: '/slow/:feed'
}

export const side = atom<'first' | 'second'>('first')

export function toggleSide(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    switch (side.get()) {
      case 'first':
        side.set('second')
        break
      case 'second':
        side.set('first')
        break
      default:
        side.set('first')
    }
  }
}

router.subscribe(route => {
  if (route.route === 'add' && route.params.url) {
    side.set('second')
  } else if (route.route === 'categories' && route.params.feed) {
    side.set('second')
  } else if (route.route === 'fast' && route.params.post) {
    backRoutes.fast = `/fast/${route.params.category}`
    side.set('second')
  } else if (route.route === 'slow' && route.params.post) {
    backRoutes.slow = `/slow/${route.params.feed}`
    side.set('second')
  } else {
    side.set('first')
  }
})
