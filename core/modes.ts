import { computed } from 'nanostores'

import { fatal } from './errors.ts'
import { router } from './router.ts'

/**
 * Colors of the app’s background:
 *
 * - `comfort`: yellow-ish “better to eyes” theme for the reading.
 * - `fast`: other white theme on fast pages to force people read them
 *   more rare.
 * - `error`: the same reading theme, but moved to the dangerous hue.
 */
export type ThemeMode = 'comfort' | 'error' | 'fast'

export const themeMode = computed(
  [router, fatal],
  (route, error): ThemeMode => {
    if (error || route.route === 'fatal') {
      return 'error'
    } else if (route.route === 'fast') {
      return 'fast'
    } else {
      return 'comfort'
    }
  }
)
