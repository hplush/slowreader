import { computed } from 'nanostores'

import { router } from './router.ts'

export const comfortMode = computed(router, route => route.route !== 'fast')
