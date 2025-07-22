import { computed } from 'nanostores'

import { type RouteName, router } from './router.ts'

const FAST = new Set<RouteName>(['fast', 'notFound'])

/**
 * Do we need to use yellow-ish “better to eyes” theme.
 *
 * We are using other white theme on fast pages to force people read them
 * more rare.
 */
export const comfortMode = computed(router, route => {
  return !FAST.has(route.route)
})

export const errorMode = computed(router, route => {
  return route.route === 'notFound'
})
