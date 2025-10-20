import { fromMediaQuery } from '@nanostores/media-query'
import { theme } from '@slowreader/core'
import { computed } from 'nanostores'

let systemTheme = fromMediaQuery(
  '(prefers-color-scheme: dark)',
  'dark',
  'light'
)

export const pageTheme = computed([theme, systemTheme], (settings, system) => {
  return settings === 'system' ? system : settings
})

export const MOBILE_WIDTH = 1024
export const mobileMedia = fromMediaQuery(`(max-width: ${MOBILE_WIDTH}px)`)

export const systemReducedMotion = fromMediaQuery(
  '(prefers-reduced-motion:reduce)'
)

export const onlyTouch = fromMediaQuery(
  '(any-hover: none) and (any-pointer: coarse)'
)
