import { computed } from 'nanostores'

import { router } from './router.ts'

/**
 * Do we need to use yellow-ish “better to eyes” theme.
 *
 * We are using other white theme on fast pages to force people read them
 * more rare.
 */
export const comfortMode = computed(router, route => route.route !== 'fast')
