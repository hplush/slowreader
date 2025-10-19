import { fromMediaQuery } from '@nanostores/media-query'
import { useAnimations } from '@slowreader/core'
import { computed } from 'nanostores'

export const systemReducedMotion = fromMediaQuery(
  '(prefers-reduced-motion:reduce)'
)

export const reducedMotion = computed(
  [systemReducedMotion, useAnimations],
  (system, settings) => {
    return system ? true : !settings
  }
)
